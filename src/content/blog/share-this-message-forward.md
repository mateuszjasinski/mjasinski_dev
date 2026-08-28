---
title: 'Pass This Message Along'
description: 'Flooding in a satellite constellation: how to get a command from Earth to a rover on Mars without knowing the route - and how not to drown in your own broadcast'
pubDate: 'Aug 28 2026'
tags: ['Python', 'System design']
---

![Satellites](/satelites.jpeg)

When an operator in mission control sends a command to a rover on Mars, the signal
first reaches one of the satellites orbiting the Red Planet. The trouble is that the
rover happens to be on the night side, and the satellite that received the command
can't see it at all. Its neighboring satellites, on the other hand, can see it
perfectly.

So it does the only sensible thing: it tells everyone it can hear. They repeat it to
their neighbors, those to the next ones - until the command reaches a satellite that
happens to have the rover in range, and that one drops it down to the surface. No one
along the way knows where the rover is. No one knows the map of the network. Everyone
knows just one rule: **pass it on**.

That's flooding - and in this naive form it just sank the entire constellation.

## Caught in a loop

Let's look at our constellation. Satellite A receives a command and sends it to its
neighbors B and D. B forwards it to C, C to D, and D - not knowing it has already
been going around - sends it back to A. A treats it as new and broadcasts it again.
Copies multiply and circle the orbits forever.

We call this a broadcast storm: a single message turns into an avalanche of copies
that never goes quiet. So every satellite has to ask itself two questions before it
forwards anything.

## I've seen this already - skip it

First question: *have I already seen this message?*

To answer it, every message needs an identifier assigned *once, when it's created* -
never on a subsequent relay.

```python
@dataclass(frozen=True)
class Message:
    id: str          # assigned once, at the origin - never changes on relay
    ttl: int         # hops remaining - we'll come back to this
    payload: bytes
```

If this sounds like the idempotency key from
[You Can't Undo a Command Sent to Mars](/blog/you-cant-undo-a-command-sent-to-mars/),
that's because it is. There the rover rejected duplicate commands; here every
satellite rejects duplicates of a message it has already passed on.

```python
@dataclass
class Satellite:
    #: IDs we've already forwarded, so we never forward them twice.
    seen: set[str] = field(default_factory=set)

    def relay(self, msg: Message) -> None:
        if msg.id in self.seen:      # already handled -> drop it, kill the loop
            return
        self.seen.add(msg.id)

        if self.sees_rover():
            self.deliver(msg)        # dropped down to the surface
            return
        ...
```

A single simple `set` is enough to stop messages from circling forever: a message
passes through each satellite exactly once.

## Hop counter - TTL

Second question: *how long should I keep forwarding this message?*

A satellite can reset, memory is limited, and after a restart the `seen` set is
wiped. Then an old, already-forgotten message can set off on another lap around the
constellation.

This is where the hop counter (TTL) comes in - the maximum number of hops between
satellites, decreasing after each jump.

```python
        if msg.ttl <= 0:             # travelled far enough -> give up
            return

        hop = replace(msg, ttl=msg.ttl - 1)
        for neighbor in self.in_range():
            neighbor.relay(hop)      # pass it on
```

TTL is a safeguard independent of memory: even if every other mechanism fails, a
message's lifespan is capped in advance. We pick the counter to match the size of the
constellation, with a small margin.

## Flooding doesn't know the route - and that's the point

Why flood the whole network when a single good route to the rover would do? Because a
route requires knowledge - who is where, who connects to whom, and whether they can
relay a message right now. And in a moving satellite constellation that knowledge goes
stale by the minute.

Flooding doesn't need that knowledge. We pay with redundant traffic, but in return we
get resilience: if *any* path to the rover exists, the message will find it. Copies
travel along different routes, so cutting one of them doesn't stop the command from
arriving.


## Your cluster does the same thing

You don't need a satellite to run this - you most likely already have it in
production.

**Gossip.** Redis Cluster, Consul, Cassandra, or Serf discover who's alive in the
cluster exactly this way: a node "gossips" about its state to random neighbors, those
pass it on, and after a few rounds the whole cluster knows the same thing. No central
registry, resilient to any single node going down. The same epidemic "pass it on".

**WebSocket fan-out.** You have several nodes holding connections. A message lands on
node A, but the recipient is hanging off node C. A doesn't know every connection, so
it broadcasts over a backplane (Redis pub/sub, the Socket.IO adapter, the SignalR
backplane), and the right node delivers. A satellite that can't see the rover is the
node that isn't holding the target connection.

| In the constellation     | In your system                            |
| ------------------------ | ----------------------------------------- |
| "pass it on" to neighbors | gossip membership (Redis Cluster, Consul) |
| dedup by message `id`    | dedup by message-id on the backplane pub/sub |
| TTL / hop counter        | max hop / drop on a repeated event         |
| broadcast storm          | re-broadcast loop, event storm             |

And that broadcast storm from the first section? It's the same failure that lets a
misconfigured pub/sub loop an event between two services and take both of them down.
The same `seen` set that calmed the ring saves your backplane too.