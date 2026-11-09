---
title: "Protected Attributes and Methods"
subtitle: "The single-underscore convention: members meant for the class and its children, not outside code."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
In Python, protected attributes and methods are class members that should *not* be accessed directly from outside the class. However, they can be accessed within the class and in child classes (we'll meet child classes in the Inheritance section).

Protected attributes are denoted by prefixing the attribute/method name with a single underscore `_`.

```python
class SuperHero:
    def __init__(self, name: str, power_level: int):
        self._name = name                # protected attribute
        self._power_level = power_level  # protected attribute

    def get_name(self) -> str: # public method
        return self._name

    def _some_protected_method(self) -> None: # protected method
        pass

    def some_public_method(self) -> None:
        self._some_protected_method()
```

> Unlike other languages, Python doesn't enforce access control for protected attributes. We can still access them directly, but it's not recommended. Using an underscore prefix is a convention to signal to other developers that these attributes shouldn't be accessed directly from outside.

Below is the recommended way to access protected attributes and methods:

```python
spider_man = SuperHero("Spider-Man", 85)

print(spider_man._name)      # Allowed but discouraged
print(spider_man.get_name()) # Recommended

spider_man._some_protected_method() # Allowed but discouraged
spider_man.some_public_method()     # Recommended
```

- To access protected attributes, use the public methods.
- To access protected methods, use the public methods.
