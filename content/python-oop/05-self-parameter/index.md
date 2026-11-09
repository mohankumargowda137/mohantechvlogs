---
title: "The self Parameter"
subtitle: "How Python knows which object a method is working on, and why self is always the first parameter."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
When we create a superhero or call a method, how does Python know which superhero we're talking about? This is where `self` comes in!

`self` is how Python refers to the specific object being created or acted upon. It allows each superhero to have their own set of attributes and use their own powers.

> In some other languages, `this` is used instead of `self`.

Let's look at our `SuperHero` class again:

```python
class SuperHero:
    def __init__(self, name, power, health, speed):
        self.name = name
        self.power = power
        self.health = health
        self.speed = speed

    def use_power(self):
        print(f"{self.name} uses {self.power}!")
```

Notice how `self` is the *first* parameter in all our methods, including `__init__`. This is a Python convention and is required for methods to work.

## How `self` works in method calls

To better understand how `self` works, it can be helpful to think of it this way:

```python
spider_man = SuperHero("Spider-Man", "web-slinging", 100, 90)
spider_man.use_power() # SuperHero.use_power(spider_man)
```

- `self` inside `use_power()` refers to `spider_man`
