---
title: "The __init__ Method"
subtitle: "The special method that sets up a new object's starting state every time you create one."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
The `__init__` method we've been using is a special method in Python classes, also known as a constructor. Its job is to initialize the attributes of a new object when it's created.

> The `__init__` method is technically *not* a constructor in Python, but it's often referred to as one. The `__new__` method is the actual constructor in Python.

```python
class SuperHero:
    def __init__(self, name, power):
        self.name = name
        self.power = power
```

The `__init__` method is automatically called when we create a new object from our class. It sets up the initial state of the object.

In the above code, `__init__` is responsible for setting the initial values for `name` and `power` for each new superhero we create.

```python
# Creating a superhero
iron_man = SuperHero("Iron Man", "repulsor beams")
```

Above we created a `SuperHero` object called `iron_man` which calls the `__init__` method. Logically, this is equivalent to `SuperHero.__init__(iron_man, "Iron Man", "repulsor beams")`.

- We don't need to explicitly pass anything for the `self` parameter because Python handles this automatically.
- `self` inside `__init__` refers to the new `iron_man` object.
- The other parameters are passed to the `__init__` method to initialize the attributes of the object.

After this process, `iron_man` is a fully initialized `SuperHero` object with all its attributes set.
