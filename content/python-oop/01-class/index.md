---
title: "Class"
subtitle: "What a class is, why we need one, and how to define and name it in Python."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
A [class](https://docs.python.org/3/tutorial/classes.html) is a blueprint for creating objects.

```python
class SuperHero:
    def __init__(self, name: str, power: str, health: int, speed: int):
        self.name = name
        self.power = power
        self.health = health
        self.speed = speed
```

In Python, a class is defined with the keyword `class` followed by the name of the class and a colon. The `__init__` method is a special method that belongs to the class. It creates an object and initializes its attributes.

Notice that the `__init__` method has an argument `self`. This is required. The `self` variable allows us to add attributes to our object. It also prevents name conflicts, since `name` and `self.name` are different variables.

## What problems does `class` solve?

- **Repetition**: You have to define each hero individually.
- **Messy code**: It's hard to keep track of all the hero attributes and their values.
- **Scalability**: What if you need to create 50 different heroes? Your code would become unmanageable very quickly.

In Python, `self` represents the instance of the class. It's used to access variables and methods associated with the class. When you create an object from a class, Python automatically passes the object as the first argument to the `__init__` method. You can name this argument anything you like, but `self` is the convention.

## How to name classes in Python?

Class names in Python use the PascalCase convention, meaning each word starts with a capital letter and there are no underscores between words (e.g., `SuperHero`, `IronMan`, `SpiderMan`).
