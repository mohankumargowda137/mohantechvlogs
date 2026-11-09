---
title: "Inheritance Basics"
subtitle: "Build a new class on top of an existing one and reuse its code, writing only what's different."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "Python tutorial: Inheritance"
    url: https://docs.python.org/3/tutorial/classes.html#inheritance
---
Inheritance is a fundamental concept in object-oriented programming that allows you to create a new class based on an existing class. The new class, known as the child class or subclass, inherits properties and methods from the existing class, known as the parent class or superclass.

Inheritance allows us to create new classes based on existing ones. Instead of modifying an existing class, inheritance lets us reuse its code while only writing the differences we need in the new class.

## Example

For example, let's say we have a class `Superhero`.

```python
class Superhero:
    def __init__(self, name: str, power: str):
        self.name = name
        self.power = power
```

Now we want to create a new class `Avenger` that is a modified version of the `Superhero` class. The `Avenger` class will have the same properties and methods as the `Superhero` class, but we can also add a new method `fly` that is specific to the `Avenger` class.

```python
class Avenger(Superhero):
    def fly(self) -> None:
        print(f"{self.name} can fly using {self.power}")

iron_man = Avenger("Iron Man", "repulsor beams")
iron_man.fly() # Iron Man can fly using repulsor beams
```

In this example, the `Avenger` class inherits from the `Superhero` class. The `Avenger` class has the properties `name` and `power` from the `Superhero` class, even though we didn't define them in the `Avenger` class, plus its own `fly` method.

The syntax for inheriting from a class is as follows:

```python
class ChildClass(ParentClass):
    # Child class code here
    ...
```

When an instance of a child class is created and the child doesn't define its own `__init__`, the `__init__` of the parent class is called automatically. This is why we can pass the arguments `name` and `power` to the `Avenger` class, even though they are not defined in the `Avenger` class.
