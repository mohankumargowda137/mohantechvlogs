---
title: "The Diamond Problem and MRO"
subtitle: "When two parents define the same method, Python's Method Resolution Order decides which one runs."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "The Python 2.3 Method Resolution Order"
    url: https://docs.python.org/3/howto/mro.html
---
Multiple inheritance is a powerful but complex feature. It is very important to use multiple inheritance carefully. If used incorrectly, you can encounter situations where methods are inherited from multiple parent classes, leading to ambiguous behavior known as the diamond problem.

## Understanding the Diamond Problem

Let's see an example of a diamond problem:

```python
class A:
    def print_method(self) -> None:
        print("A")

class B(A):
    def print_method(self) -> None:
        print("B")

class C(A):
    def print_method(self) -> None:
        print("C")

class D(B, C):
    pass

d = D()
d.print_method()  # Which method will be called?
```

In the above code you can see that `D` is inheriting from `B` and `C`, and `B` and `C` are inheriting from `A`. Now when you call `d.print_method()`, which method will be called? This ambiguity is known as the diamond problem.

This inheritance structure creates a diamond shape, as illustrated below:

```text
   A
  / \
 B   C
  \ /
   D
```

## How Python Resolves Methods

Python uses Method Resolution Order (MRO) to determine which method to call when dealing with multiple inheritance. Here's how it works:

- First, Python looks for the method in the current class `D`
- If not found, it checks the first parent class `B` as it is the first parent class passed to the `D` class
- Then the second parent class `C` as it is the second parent class passed to the `D` class
- Finally, it checks the base class `A`

You can view this order using the `__mro__` attribute:

```python
print(D.__mro__)
# Output: (<class '__main__.D'>, <class '__main__.B'>, <class '__main__.C'>, <class '__main__.A'>, <class 'object'>)
```

As you can see, the MRO is `D, B, C, A` (and finally `object`), so `d.print_method()` prints `B`.
