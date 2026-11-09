---
title: "Objects"
subtitle: "An object is an instance of a class. Create your first objects from the SuperHero blueprint."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
## What are Objects?

An object is an instance of a class. It's a specific item created using the blueprint defined by the class.

## Creating Objects

We have seen the class definition for a `SuperHero` before.

```python
class SuperHero:
    def __init__(self, name: str, power: str, health: int, speed: int):
        self.name = name
        self.power = power
        self.health = health
        self.speed = speed
```

We can create an object by calling the class and passing in the required arguments.

```python
# Creating superhero objects
iron_man = SuperHero("Iron Man", "repulsor beams", 100, 80)
spider_man = SuperHero("Spider Man", "web slinging", 90, 95)
```

When we write `iron_man = SuperHero("Iron Man", "repulsor beams", 100, 80)`, we're telling Python:

- Create a new object variable called `iron_man`
- Use the `SuperHero` class to create it
- Set its `name` attribute to `"Iron Man"`
- Set its `power` attribute to `"repulsor beams"`
- Set its `health` attribute to `100`
- Set its `speed` attribute to `80`
