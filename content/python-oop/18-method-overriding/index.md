---
title: "Method Overriding"
subtitle: "Change how an inherited method behaves by redefining it in the child class."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
So far, we have seen how to inherit properties and methods from a parent class. But what if we want to change the behavior of a method in a child class? This is where method overriding comes in.

Method overriding allows us to change the behavior of a method in a child class. This is useful when we want to change the behavior of a method that is inherited from a parent class.

**Let's see an example:**

```python
class Superhero:
    def __init__(self, name: str):
        self.name = name

    def fight(self) -> None:
        print("Superhero fights with advanced weapons!")

class Avenger(Superhero):
    # Override the fight method
    def fight(self) -> None:
        print("Avenger fights with advanced weapons!")
```

In this example, we have a `Superhero` class with a `fight` method. We then have an `Avenger` class that inherits from the `Superhero` class. The `Avenger` class has its own `fight` method that overrides the `fight` method in the `Superhero` class.

```python
avenger = Avenger("Iron Man")
avenger.fight() # Output: Avenger fights with advanced weapons!
```

Above, we create an instance of the `Avenger` class and call the `fight` method. The `fight` method in the `Avenger` class is called instead of the `fight` method in the `Superhero` class.

The method from the child class is called instead of the method from the parent class. This is method overriding.
