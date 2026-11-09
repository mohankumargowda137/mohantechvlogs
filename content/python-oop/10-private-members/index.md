---
title: "Private Attributes and Methods"
subtitle: "Double-underscore members: the strongest form of information hiding Python offers."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Private attributes and methods are class members that should not be accessed from outside the class. They are denoted by prefixing the attribute/method name with double underscores (`__`).

Unlike protected attributes, they are not accessible from child classes. We will learn about child classes in the Inheritance section.

```python
class SuperHero:
    def __init__(self, name: str, power_level: int):
        self.__name = name                # private attribute
        self.__power_level = power_level  # private attribute

    # private method
    def __secret_power(self) -> str:
        return f"Using {self.__name}'s secret power!"

    # public method to access private method
    def use_power(self) -> str:
        return self.__secret_power()

    # public method to access private attribute
    def get_power_level(self) -> int:
        return self.__power_level
```

In the above code, the `__name` and `__power_level` attributes are private, meaning they cannot be accessed directly from outside the class. The same goes for the `__secret_power` method. Though we can access them using the public methods `get_power_level` and `use_power`.

**When an attribute/method is private:**

- It should not be directly accessed using normal dot notation from outside the class.
- It's meant to be used only within the class itself.
- It provides the strongest form of information hiding in Python.
