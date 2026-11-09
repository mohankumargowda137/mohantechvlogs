---
title: "Class Attributes"
subtitle: "Data shared by every object of a class, like a running count of heroes ready for battle."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
When assembling the Avengers to fight Thanos, certain information needs to be shared across all heroes. For instance, Nick Fury needs to track how many heroes we have ready for battle. This is where class attributes come in.

```python
class Superhero:
    hero_count = 0      # Class attribute

    def __init__(self, name: str, power: str):
        self.name = name      # Instance attribute
        self.power = power    # Instance attribute
        Superhero.hero_count += 1
```

In the above code, `hero_count` is a class attribute, whereas `name` and `power` are instance attributes.

In this case, `hero_count` belongs to the entire superhero class - not to individual heroes. This attribute is shared by all instances of the class. Unlike instance attributes, we don't use the `self` keyword to access class attributes.

Class attributes must be declared *outside* the `__init__` method and without the `self` keyword.

```python
iron_man = Superhero("Iron Man", "repulsor beams")
thor = Superhero("Thor", "lightning")

print(f"Heroes ready to face Thanos: {Superhero.hero_count}")  # This should print 2
```

In the above code, we created two instances of the `Superhero` class, `iron_man` and `thor`. We then accessed the class attribute `hero_count` using the class name `Superhero.hero_count`.

Notice that we access class attributes using the class name, not the instance name. This is because class attributes are shared by all instances of the class. Class attributes can be updated outside the class as well.

> Note: We can also access the class attribute using the instance of the class `iron_man.hero_count` but it's not recommended. That's because the class attribute belongs to the class, not to the instance.
