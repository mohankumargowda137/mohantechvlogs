---
title: "Public Attributes and Methods"
subtitle: "What encapsulation means, and the default in Python: members anyone can read and change."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
## What is Encapsulation?

- Encapsulation is the concept of wrapping data and methods that work on the data within one unit, called a class. In addition, it restricts access to some of the object's components.
- The purpose is to hide the internal details of an object and only expose the necessary parts of the object to the outside world.
- A real world analogy is a car. The car is a complex system with many moving parts. However, as a driver, you don't need to know how the car works internally. You only need to know how to operate the car.

## Public attributes and methods

In Python, public attributes or methods can be accessed and modified directly from outside the class. By default, *all* attributes and methods in Python are public.

```python
class SuperHero:
    def __init__(self, name: str, power_level: int):
        self.name = name                # public attribute
        self.power_level = power_level  # public attribute

    # Public method
    def display_power_level(self) -> None:
        print(f"{self.name} has a power level of {self.power_level}")
```

**When an attribute or method is public, we can:**

- Access it directly using dot notation
- Modify the attribute from outside the class
- Call the method from outside the class

**Let's see public attributes in action:**

```python
# Creating a superhero
spider_man = SuperHero("Spider-Man", 85)

# Accessing public attributes/methods
print(spider_man.name)
spider_man.display_power_level()

# Modifying public attributes
spider_man.power_level = 90
```

**Public attributes are suitable when:**

- The attribute doesn't need validation
- Direct access won't compromise the object's integrity
- You want to keep the code simple and straightforward
