---
title: "Object Attributes"
subtitle: "Read and change an object's attributes with dot notation, and why you shouldn't change their types."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Attributes are the properties that define or belong to an object. In our superhero example, we have the following attributes for a superhero: `name`, `power`, `health`, and `speed`.

## Accessing Attributes

To access an object's attributes, we use dot notation: `object_name.attribute_name`. Let's create a superhero and access its attributes:

```python
class SuperHero:
    def __init__(self, name: str, power: str, health: int, speed: int):
        self.name = name
        self.power = power
        self.health = health
        self.speed = speed

iron_man = SuperHero("Iron Man", "repulsor beams", 100, 80)

print(iron_man.name)    # Iron Man
print(iron_man.power)   # repulsor beams
```

## Modifying Attributes

We can also *modify* an attribute's value using the same dot notation:

```python
iron_man.health = 90
iron_man.power = "advanced repulsor technology"

print(iron_man.health)  # 90
print(iron_man.power)   # advanced repulsor technology
```

## Attribute Types

While Python won't give us any errors when changing the data type of an attribute, we should avoid doing so to avoid unexpected behavior.

```python
iron_man.name = 42       # Allowed but bad practice
iron_man.health = "full" # Allowed but bad practice
```
