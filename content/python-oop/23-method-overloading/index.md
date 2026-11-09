---
title: "Method Overloading"
subtitle: "Python doesn't overload methods like Java or C++, but default arguments and *args get you the same result."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Method Overloading is a feature that allows a class to have multiple methods with the same name, but different parameters. This is a form of polymorphism (one function name, multiple implementations).

```python
def method_name(parameter1, parameter2):
    pass

def method_name(parameter1, parameter2, parameter3):
    pass
```

In the above example, we have two methods with the same name `method_name`, but different parameters. Method overloading basically means that if you call `method_name` with two parameters, it will use the first method, and if you call it with three parameters, it will use the second method.

But there is a problem with this approach. Python does not support method overloading in the same way that languages like Java or C++ do. In Python, the second definition simply replaces the first.

## The Solution

We can achieve method overloading in Python through default arguments or variable-length arguments.

```python
class Calculator:
    # Method 1: Default arguments
    def add(self, a: int, b: int, c: int = 0) -> int:
        return a + b + c

    # Method 2: Variable-length arguments
    def add_multiple(self, *args: int) -> int:
        return sum(args)
```

**Example usage:**

```python
calc = Calculator()

print(calc.add(5, 10))        # Output: 15
print(calc.add(5, 10, 15))    # Output: 30

print(calc.add_multiple(5, 10, 15, 20))    # Output: 50
print(calc.add_multiple(1, 2))             # Output: 3
```

The above code demonstrates two methods that achieve method overloading-like behavior.

- Using Default Arguments:
  - In the first `add` method, we make the third parameter optional by giving it a default value of `0`
  - This allows the method to work with either 2 or 3 arguments
  - When called with 2 arguments, `c` defaults to `0`
  - When called with 3 arguments, all values are used
- Using Variable-Length Arguments:
  - The `add_multiple` method uses `*args` to accept any number of arguments
  - The star `*` before `args` tells Python this method can accept any number of inputs. In the example, you can see that it accepts 4 and 2 arguments.
  - We use the built-in `sum()` function to add all the numbers together

> Remember that while this achieves similar results to traditional method overloading, it's not technically the same thing. Python will always execute the same method; we're just making that method flexible enough to handle different numbers of arguments.
