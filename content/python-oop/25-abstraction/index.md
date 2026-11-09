---
title: "Abstraction"
subtitle: "Hide complex implementation details and show only what the user of a class needs."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
---
Abstraction is the concept of hiding complex implementation details and showing only the necessary features to the outside world. Think of it like a TV remote - you just press buttons to change channels, not caring about the electronics inside.

**Data Abstraction**

- Hides complex data details
- In Python achieved through: private variables

**Behavioral Abstraction**

- Hides complex method implementations
- In Python achieved through: abstract methods

Let's understand abstraction through a simple example:

```python
class TempConverter:
    def __init__(self, celsius):
        self._celsius = celsius    # Hidden internal state

    def get_fahrenheit(self) -> float:
        return (self._celsius * 9/5) + 32

temp = TempConverter(25)
print(temp.get_fahrenheit())  # 77.0
```

In this code:

- The `get_fahrenheit` method is the public interface that *abstracts* away the internal implementation details
- Internal variable `_celsius` is hidden from users
- Users don't need to understand the conversion formula

## Why use abstract methods?

Abstract methods are a powerful tool for achieving abstraction because they:

- **Hide implementation details (abstraction)**: The base class only declares what methods must exist, without specifying how they work.
- **Enforce consistency**: Child classes must implement these methods, ensuring a standard interface across all subclasses, which allows for polymorphism.
- **Prevent incomplete objects**: You can't create instances of classes with abstract methods, ensuring only fully-implemented classes can be used.
