---
title: "Duck Typing"
subtitle: "If it walks like a duck and quacks like a duck: objects are judged by what they can do, not their class."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Duck Typing is a polymorphism concept where the type of an object is determined by its behavior rather than its explicit declaration. In other words, if an object has the methods or attributes that are required by a function or method, it can be used in that context, regardless of its actual class or type.

The name Duck Typing comes from the phrase "If it walks like a duck and quacks like a duck, then it's a duck!"

```python
class IronMan:
    def attack(self) -> str:
        return "Repulsor Blast!"

class Thor:
    def attack(self) -> str:
        return "Lightning Strike!"

def hero_attack(hero) -> None:
    print(hero.attack())

# Create heroes and attack!
iron_man = IronMan()
thor = Thor()

hero_attack(iron_man)  # Repulsor Blast!
hero_attack(thor)      # Lightning Strike!
```

We can see that `hero_attack` doesn't check the type of the object, it only checks if the object has the `attack` method.

This is not possible in languages like Java or C++. In those languages, we need to declare the type of the object and then use it. Python makes this possible because it is a [dynamically typed language](https://neetcode.io/problems/python-dynamic-typing).

## Why use Duck Typing?

- **Flexibility**: We don't need `IronMan` or `Thor` to inherit from a `Superhero` class. Any new hero class that has an `attack()` method will work with `hero_attack()`!
- **Less Code**: No parent classes, no inheritance syntax. Just create classes with the methods you need.
- **Loose Coupling**: `IronMan` doesn't need to know `Thor` exists, and neither needs to know about a `Superhero` parent class. They just need their `attack()` method!

> While Duck typing is powerful, it can also be error prone. We may accidentally call a method that doesn't exist on the object.
