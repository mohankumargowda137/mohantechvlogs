---
title: "Abstract Methods and Classes"
subtitle: "Use the abc module to declare methods every child class must implement."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "abc — Abstract Base Classes"
    url: https://docs.python.org/3/library/abc.html
---
So far we have seen the general concept of abstraction. Now let's explore two key concepts which are used to achieve abstraction in Python.

- An **abstract method** is a method that is declared in a base class, but contains no implementation. The child class must implement the abstract method. Abstract methods are used to enforce a contract on subclasses. Subclasses must implement the abstract method, otherwise they will raise an error.
- An **abstract class** is a class that contains one or more abstract methods. It serves as a blueprint for other classes and cannot be instantiated on its own.

Let's look at an example.

```python
from abc import ABC, abstractmethod

class Superhero(ABC):
    def __init__(self, name):
        self._name = name

    def get_name(self) -> str: # public methods
        return self._name

    @abstractmethod
    def fly(self) -> str:
        pass

class Superman(Superhero):
    def fly(self) -> str:
        return "Up up and away!"
```

In the above example:

- `Superhero` is the base abstract class that inherits from `ABC`. In Python, abstract classes are created by inheriting from `ABC`.
- The `@abstractmethod` decorator marks `fly()` as an abstract method. In Python, abstract methods are created by decorating a method with the `@abstractmethod` decorator.
- `Superman`, and any other child class that inherits from `Superhero`, must implement the `fly()` method.
- Non-abstract methods like `get_name()` are optional to override.

Note you can't create an instance of the `Superhero` class because it is an abstract class and has an abstract method.

```python
hero = Superhero("Superman")
```

This will raise a `TypeError` because the `fly()` method is not implemented.
