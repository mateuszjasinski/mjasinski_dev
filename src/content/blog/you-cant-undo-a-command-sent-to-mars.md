---
title: 'You Can''t Undo a Command Sent to Mars'
description: 'Practical idempotency: how to safely command a Mars rover and keep it out of a crater'
pubDate: 'Aug 21 2026'
tags: ['Python', 'System design']
---

![Rover accident](/rover.jpeg)

And it could have been avoided. When an operator on Earth sends a command to the
rover, the signal travels one way for anywhere between 3 and 22 minutes (depending on how the planets are
aligned) — so a full round trip can take almost three quarters of an hour.

Let's say we send the command `drive_forward(10m)` and get no confirmation. The operator sends the message
again — and everything ends just like in our comic.

## Idempotency starts in your API's shape, not in your code

Sometimes the simplest solution is to design the API correctly in the first place. Some operations are
idempotent by definition, others never are.

| Command             | Semantics | Called twice   | Final state       |
| ------------------- | --------- | -------------- | ----------------- |
| `drive_to(10)`      | absolute  | (→10), (→10)   | `x = 10`          |
| `drive_forward(10)` | relative  | (+10), (+10)   | `x = 20`          |
| `set_heading(90)`   | absolute  | (→90°), (→90°) | `heading = 90°`   |
| `rotate_by(90)`     | relative  | (+90°), (+90°) | `heading = 180°`  |

A relative operation describes a change; an absolute one describes the expected end state. That distinction
matters, because it defines what we actually expect our code to guarantee.

## Radio silence — or how to talk to each other

### The idempotency key belongs to the request, not the attempt

The most important thing to remember: the sequence number (the idempotency key) must be assigned
when the command is created, never when it's sent.

```python
@dataclass(frozen=True)
class Command:
    seq: int
    name: str
    kind: Kind
    args: dict
```

This is one of the most common mistakes: on a retry a fresh number gets assigned, and a new number means a
brand-new command as far as the rover is concerned.

### The Martian way of handling it

On Earth everything is much easier: we drop the command into a database, set
`ON CONFLICT DO NOTHING`, and call it a day.

On Mars the real fun begins. The rover has limited resources, and its processor is built to survive
the harshest conditions at the cost of raw compute. So we'll be working within a tight budget.


```python
WINDOW_SIZE = 64

@dataclass
class Rover:
    x: float = 0.0
    y: float = 0.0
    heading: float = 0.0

    #: The lowest number we haven't executed yet.
    expected_seq: int = 0
    #: Commands from the future, waiting for the gap to be filled.
    pending: dict[int, Command] = field(default_factory=dict)

    def _execute(self, cmd: Command) -> None: ...  # among other things, self.expected_seq += 1

    def _run(self, cmd: Command) -> Ack:
        self._execute(cmd)
        return Ack(cmd.seq, executed=True, detail="executed")

    def receive(self, cmd: Command) -> list[Ack]:
        if cmd.seq < self.expected_seq:
            return [Ack(cmd.seq, executed=False, detail="duplicate")]

        if cmd.seq >= self.expected_seq + WINDOW_SIZE:
            return [Ack(cmd.seq, executed=False, detail="out_of_window")]

        if cmd.seq in self.pending:
            return [Ack(cmd.seq, executed=False, detail="duplicate_buffered")]

        if cmd.seq > self.expected_seq:
            self.pending[cmd.seq] = cmd
            return [Ack(cmd.seq, executed=False, detail="buffered")]

        # Run the current command and everything it unblocks.
        acks = [self._run(cmd)]
        while (nxt := self.pending.pop(self.expected_seq, None)) is not None:
            acks.append(self._run(nxt))
        return acks
```

#### A duplicate still needs an ack

Whether or not the operation has already run, we have to respond to it. Most likely mission control
resent the command because it never got an answer. Leave them without a reply and they'll keep
retrying forever.

```python
if cmd.seq < self.expected_seq:
    return [Ack(cmd.seq, executed=False, detail="duplicate")]
```

#### Outside the window, we don't guess

We get a message with a number 1000 higher than the last one we executed — what could that mean?
Either some stray packet from years ago just reached us, or we've lost over 1000 commands.
Either way we have to respond with a request to resync: for example, we could send our own
number and let mission control replay every command that follows it.

```python
if cmd.seq >= self.expected_seq + WINDOW_SIZE:
    return [Ack(cmd.seq, executed=False, detail="out_of_window")]
```

#### Deduplication isn't the same as ordering

Our commands can arrive out of order, and running `rotate_by` then `drive_forward` leaves the rover in a
completely different place than `drive_forward` then `rotate_by`.

Idempotency won't solve ordering for us, so if order is critical to the system, we need to remember
to buffer.

```python
if cmd.seq > self.expected_seq:
    self.pending[cmd.seq] = cmd
    return [Ack(cmd.seq, executed=False, detail="buffered")]
```

`buffered` confirms **receipt**, not execution. A buffered command only runs once the gap in front of it is
filled — and its sender needs to find out when that happens. That's why `receive` doesn't return a single
Ack but a **list**: one for the current command and one for each command it unblocks. Every Ack carries its
own `seq`, so mission control can match each confirmation to the right request.

```python
seq=5 (gap at 4) -> [Ack(5, executed=False, "buffered")]
seq=4            -> [Ack(4, executed=True, "executed"),   # current
                    Ack(5, executed=True, "executed")]   # unblocked from the buffer
```

Without this, the sender of `seq=5` would be stuck holding a lone `buffered` and would retry it forever —
exactly the problem we set out to solve in "A duplicate still needs an ack."

## This is only a simulation

There's no real radio here, no memory limits, and we've deliberately skipped topics like command
priorities and concurrency. Still, here's what's worth taking away:

- The idempotency key belongs to the request, not the attempt. Assigned once, at creation. A retry doesn't change it.
- A duplicate must get a definitive answer. Silence or an error just makes the sender keep retrying.
- Deduplication and ordering are two different problems. Solving the first doesn't give you the second for free.
- When you're not sure whether it's a duplicate — reject, don't guess. A false rejection costs one retry. A false acceptance costs you the rover.
- And above all: design absolute operations, not relative ones. `set_state(x)` instead of `change_state_by(delta)`.