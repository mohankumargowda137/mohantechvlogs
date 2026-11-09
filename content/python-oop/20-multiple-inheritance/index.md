---
title: "Multiple Inheritance"
subtitle: "A class that inherits from more than one parent, and why you should use it carefully."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Multiple inheritance is a feature in object-oriented programming where a class can inherit attributes and methods from more than one parent class. While powerful, it is generally considered an [anti-pattern](https://stackoverflow.com/questions/406081/why-should-i-avoid-multiple-inheritance).

Let's see an example:

```python
class Swimmer:
    def swim(self):
        print("Swimming")

class Flyer:
    def fly(self):
        print("Flying")

# Duck inherits from both Swimmer and Flyer
class Duck(Swimmer, Flyer):
    pass
```

In this example, the `Duck` class inherits from both the `Swimmer` and `Flyer` classes. This means that a `Duck` object will have access to both the `swim` and `fly` methods. The names of the parent classes are passed as arguments to the `Duck` class. Currently, we are only using the methods from the parent classes so we just use the `pass` keyword to indicate that we are not adding any new methods or attributes to the `Duck` class.

Below, we create an instance of the `Duck` class and call the `swim` and `fly` methods.

```python
duck = Duck()
duck.swim() # Should print "Swimming"
duck.fly()  # Should print "Flying"
```

Be careful with multiple inheritance. It can be useful in scenarios where a class needs to inherit behavior from multiple sources. However, it can also lead to complex class hierarchies, and it's important to ensure that the inheritance is logical and avoids conflicts.

> In most cases, you should *not* use multiple inheritance. But you may see code like this in the wild.

## Basic Syntax

```python
class ChildClass(ParentClass1, ParentClass2, ...):
    # Class body
    ...
```
