---
title: "The super() Function"
subtitle: "Call the parent class's methods from a child, so you can extend behaviour instead of replacing it."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "Built-in functions: super"
    url: https://docs.python.org/3/library/functions.html#super
---
`super()` is a built-in function in Python that allows you to call methods from a parent class. It's a powerful tool for working with inheritance.

## Why use `super()`?

When working with inheritance, there are often situations where you want to extend rather than completely replace a parent class's behavior. For example:

- You might want to add extra initialization steps while keeping the parent's initialization
- You may need to enhance an existing method while maintaining its core functionality
- You could need to access parent class properties while adding new ones

**Let's see an example:**

```python
class ParentClass:
    def parent_method(self) -> None:
        print("This is the parent class method")

class ChildClass(ParentClass):
    def child_method(self) -> None:
        super().parent_method()
        print("This is the child class method")
```

In this example, the `super()` function is used to call the `parent_method` from the `ParentClass`. The `super()` function can be visualized as an object that points to the parent class. Remember `super()` itself doesn't take any arguments, but it can be used to call the parent class's methods.

## Syntax for the `super()` function

```python
super().parent_method() # Call parent class's instance method

super().__init__() # Call parent class __init__ method

super().parent_property # Access parent class property
```
