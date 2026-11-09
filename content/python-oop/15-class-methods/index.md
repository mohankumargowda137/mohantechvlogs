---
title: "Class Methods"
subtitle: "Methods that work on the whole class through cls, defined with the @classmethod decorator."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "Built-in functions: classmethod"
    url: https://docs.python.org/3/library/functions.html#classmethod
---
So far the methods we have used were all related to the instance of the class. For example, we used the `use_power` method which was used by a single superhero.

Sometimes we need special methods that work with the entire class rather than individual instances. For example, we may want to upgrade the training level of all heroes at once. Let's see how we can do that using class methods.

```python
class Superhero:
    training_level = 1  # Class attribute

    def __init__(self, name: str, power: str):
        self.name = name         # Instance attribute
        self.power = power       # Instance attribute

    @classmethod
    def upgrade_training(cls) -> None:
        cls.training_level += 1
        print(f"All heroes now at training level {cls.training_level}")
```

In the above `Superhero` class, the `upgrade_training` method is a class method.

- It uses the `@classmethod` decorator to define the class method
- It uses `cls` as the first parameter instead of `self`
- It upgrades the `training_level` (a class attribute) by `1`
- `cls` is used to access the class attribute instead of the class name `Superhero`

The below code shows the recommended way to call the class method:

```python
Superhero.upgrade_training()     # Recommended way to use class method
print(Superhero.training_level)  # 2
```

The below code shows how the class method can be called using an instance of the class, which is *not* recommended:

```python
iron_man = Superhero("Iron Man", "Flying")
iron_man.upgrade_training()     # Works but not recommended
print(iron_man.training_level)  # 3
```

**Important:** Class methods are similar to class attributes. They are shared by all instances of the class. This also means that they do *not* have access to instance attributes, which is why we don't use `self` in class methods. Class methods can be defined with additional parameters, after the `cls` parameter.
