---
title: "Static Methods"
subtitle: "Plain functions that live inside a class for organisation, with no self or cls."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "Built-in functions: staticmethod"
    url: https://docs.python.org/3/library/functions.html#staticmethod
---
So far we've seen instance methods (using `self`) and class methods (using `cls`).

There are also static methods which are similar to class methods but they don't have access to `self` or `cls`. They do not have access to instance attributes, but they *can* still access class attributes using the class name.

They are just regular functions that live inside a class for organizational purposes.

```python
class Superhero:
    def __init__(self, name: str, power: str):
        if not self.is_valid_power(power):
            raise ValueError(f"Invalid power: {power}")
        self.name = name        # Instance attribute
        self.power = power      # Instance attribute

    @staticmethod
    def is_valid_power(power: str) -> bool:
        valid_powers = ['Flying', 'Strength', 'Speed', 'Intelligence']
        for valid_power in valid_powers: # Iterate over each valid power and check if the power matches
            if power == valid_power:
                return True
        return False
```

In the above code, we defined a class `Superhero` with a static method `is_valid_power`. We call this method using the `self` parameter within the `__init__` method for validation before creating the hero.

Alternatively, we could have defined this method outside the class, but this method would never be needed outside the class. Thus, it's best to define it inside the class for organizational purposes.

Below is an example of how this class can be used. Notice that we can also call the static method using the class name.

```python
print(Superhero.is_valid_power('Flying'))         # True
print(Superhero.is_valid_power('Mind Reading'))   # False

iron_man = Superhero("Iron Man", "Flying")        # Works

mind_reader = Superhero("Hero", "Mind Reading")   # Raises ValueError
```
