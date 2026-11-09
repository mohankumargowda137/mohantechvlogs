---
title: "The @property and Setter Decorators"
subtitle: "The idiomatic Python way to write getters and setters that still look like plain attributes."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "Built-in functions: property"
    url: https://docs.python.org/3/library/functions.html#property
---
Python provides a more [idiomatic](https://stackoverflow.com/questions/84102/what-is-idiomatic-code) way to use getters and setters using the `@property` and `@setter` decorators.

```python
class Hero:
    def __init__(self, name: str):
        self.__name = name    # private attribute

    # Getter
    @property
    def name(self) -> str:
        return self.__name

    # Setter
    @name.setter
    def name(self, new_name: str) -> None:
        if new_name != "":
            self.__name = new_name
        else:
            print("Name cannot be empty!")
```

In the above code, we have defined two methods with the same name as the attribute `name`. But these are two different methods. We use `@property` to define a getter method and `@name.setter` to define a setter method. We also added validation logic in the setter method to prevent setting the name to an empty string.

```python
hero = Hero("Batman")

# Getting name
print(hero.name)        # this calls the getter method not the attribute
# Setting name
hero.name = "Superman"  # this calls the setter method not the attribute
hero.name = ""          # Error: Name cannot be empty!
```

In the above code, we created an instance of the `Hero` class and accessed and modified the `name` attribute. But internally, accessing the `name` attribute calls the getter method `name` and modifying the `name` attribute calls the setter method `name`.

> Notice that the field name is `__name` but the method names for the getter and setter are still `name`.

## Why use @property and @setter?

- Makes code look cleaner
- Feels more natural (like using attributes)
- Still gives us control (validation, etc.)
