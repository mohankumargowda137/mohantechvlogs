---
title: "Object Methods"
subtitle: "Methods are functions that belong to a class. Add behaviour to SuperHero and call it with dot notation."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Methods are functions that belong to a class or object. They define the behavior of the class or object.

## Defining methods in a class

Let's update our `SuperHero` class to include two methods, `use_power()` and `take_damage(amount)`:

```python
class SuperHero:
    def __init__(self, name, power, health, speed):
        self.name = name
        self.power = power
        self.health = health
        self.speed = speed

    def use_power(self):
        print(f"{self.name} uses {self.power}!")

    def take_damage(self, amount):
        self.health -= amount
        print(f"{self.name} takes {amount} damage. Health is now {self.health}.")
```

We can create an object of the `SuperHero` class and call the methods on it:

```python
iron_man = SuperHero("Iron Man", "super strength", 100, 90)

iron_man.use_power()     # Output: Iron Man uses super strength!
iron_man.take_damage(20) # Output: Iron Man takes 20 damage. Health is now 80.
```

Let's break down what's happening in this code:

- The `use_power()` method:
  - Takes no parameters (except `self`, which we'll explain in the next blog).
  - Prints a message saying the superhero is using their power.
- The `take_damage(amount)` method:
  - Takes a parameter `amount` and subtracts it from the object's health.
  - Prints a message about the damage taken and the object's new health.

Methods are called on an object using dot notation, like `iron_man.use_power()`. If a method takes parameters, they are passed in the same way as function arguments, e.g. `iron_man.take_damage(20)`.
