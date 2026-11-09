---
title: "Getter and Setter Methods"
subtitle: "Read and change private attributes through methods, and validate new values before they're stored."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Remember our `SuperHero` class? We used a private attribute `__power_level` and accessed it through a method:

```python
class SuperHero:
    def __init__(self, name: str, power_level: int):
        self.__name = name                # private attribute
        self.__power_level = power_level  # private attribute

    # method to get power_level
    def get_power_level(self) -> int:
        return self.__power_level
```

This method `get_power_level()` is what we call a getter - it's a method that returns (gets) the value of a private/protected attribute.

Similarly, a setter is a method that sets (changes) the value of a private or protected attribute.

Let's add a setter method to our `SuperHero` class with validation:

```python
class SuperHero:
    def __init__(self, name: str, power_level: int):
        self.__name = name                # private attribute
        self.__power_level = power_level  # private attribute

    def get_power_level(self) -> int:
        return self.__power_level

    def set_power_level(self, new_level: int) -> None:  # method to set power_level
        if 0 <= new_level <= 100:          # validation
            self.__power_level = new_level
        else:
            print("Power level must be between 0 and 100!")
```

The above method not only sets the value of the private attribute, but also validates the value. We specifically check if the new value is in between `0` and `100` using `0 <= new_level <= 100` in the `if` statement. If the value is not in the range, we print an error message in the `else` block.

This ensures we never set an invalid value for the power level. This is another reason we prefer using methods to access and modify private attributes.

> Alternatively, we could have raised an error using `raise ValueError("Power level must be between 0 and 100!")` instead of printing an error message.

## Example Usage

```python
hero = SuperHero("Thor", 80)

hero.set_power_level(90)   # Changes to 90
hero.set_power_level(150)  # Error: Power level must be between 0 and 100!
```
