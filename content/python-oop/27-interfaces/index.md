---
title: "Interfaces"
subtitle: "A pure abstract class that only defines a contract, and how it differs from an abstract class."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "abc — Abstract Base Classes"
    url: https://docs.python.org/3/library/abc.html
---
An interface in Python is just like an abstract class, but with one key difference: it contains only abstract methods. While abstract classes can mix both concrete and abstract methods, an interface is a "pure" abstract class. It only defines a contract of what methods must be implemented.

```python
from abc import ABC, abstractmethod

class Database(ABC):
    @abstractmethod
    def connect(self) -> bool:
        pass

    @abstractmethod
    def query(self, sql: str) -> list:
        pass
```

This is an interface because it contains only abstract methods `connect` and `query` - it serves as a pure contract that specifies what methods implementing classes must provide. While some programming languages have dedicated `interface` keywords, Python achieves the same functionality using abstract classes (`ABC`).

## Interfaces vs Abstract Classes

Key differences between interfaces and abstract classes in Python:

- Interfaces contain only abstract methods (pure contract)
- Abstract classes can mix both concrete and abstract methods
- Abstract classes can have constructors (`__init__`). While Python allows `__init__` methods in interfaces, it's considered bad practice as interfaces should focus purely on method contracts
