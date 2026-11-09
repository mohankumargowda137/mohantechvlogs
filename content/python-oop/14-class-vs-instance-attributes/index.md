---
title: "Class vs Instance Attributes"
subtitle: "When data belongs to the whole class and when it belongs to one object, using a bank account example."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
The below example shows a `BankAccount` class with class and instance attributes.

```python
class BankAccount:
    total_accounts = 0    # Class attribute: Shared by ALL accounts
    total_balance = 0     # Class attribute: Tracks bank's total money

    def __init__(self, name: str, balance: float):
        self.name = name        # Instance: Each account has unique owner
        self.balance = balance  # Instance: Each account has unique balance
        BankAccount.total_accounts += 1
        BankAccount.total_balance += balance
```

- We use class attributes to track bank-wide information that is shared by all accounts, such as the total number of accounts and the total balance of all accounts.
- We use instance attributes to track information that is unique to each account, such as the account owner and the balance of the account.
