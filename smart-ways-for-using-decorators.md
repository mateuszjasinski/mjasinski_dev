---
title: 'Smart ways for using decorators - part 1'
description: ""
pubDate: 'March 10 2025'
tags: ['Python']
---

This article is the first from the series, where I would like to show you, smart/unusual ways of using decorators in Python. My goal is to encurage you use them more offen to make your code much cleaner, but mostly more extandable.

In the first episode, we'll take a look in validation process for payment system.

#### Requirements

##### Project background
We're building Python application to support payment transactions. Our applications supports multiple type of transactions such as:
- Single payment
- Reccuring payment
- Pre-paid payments

Each transaction requries to perfrom multiple transactions, before it will succeed. Each months business analyse transaction log and adds new rules based on feedback.

##### Problem
Propose a solution, which will allows to easily verify transactions, at the same will be prepare for adding new validators without 

#### Solution

```python
from abc import ABC


class Validator(ABC):

    @staticmethod
    def register()
        def decorator(func):
            func.validation_function = True
            return func
        return decoratotor

    def validate(self, value: int) -> None:
        for attribute in self.__dir__():
            attribute = getattr(self, attribute)
            if callable(attribute) and getattr(attribute, 'validation_function', False):
                attribute(value)
```


```python
class SinglePaymentValidator(Validator):

    @Validator.register()
    def account_balance(...):
        ...
    
    ...
```