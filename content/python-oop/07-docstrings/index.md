---
title: "Docstrings"
subtitle: "Document classes and methods with docstrings, and read them back with __doc__ and help()."
date: 2026-11-09
thumbnail: assets/cover.svg
tags: [python, oop, classes, beginner]
references:
  - title: "Python tutorial: Classes"
    url: https://docs.python.org/3/tutorial/classes.html
  - title: "PEP 257 – Docstring Conventions"
    url: https://peps.python.org/pep-0257/
---
Docstrings are string literals that describe functions, methods, classes, or modules. They serve as documentation for our code.

```python
class SuperHero:
    """
    A class to represent a superhero.

    Attributes:
        name (str): The superhero's name
        health (int): The superhero's health points
    """

    def __init__(self, name: str, health: int) -> None:
        """Initialize a new SuperHero instance."""
        self.name = name
        self.health = health

    def take_damage(self, amount: int) -> None:
        """
        Reduce the superhero's health by the given amount.

        Args:
            amount (int): The amount of damage to inflict
        """
        self.health -= amount
        print(f"{self.name} takes {amount} damage.")
```

We have three docstrings in this class:

- The class docstring describes the class and its attributes.
- The `__init__` method docstring describes the method and its parameters.
- The `take_damage` method docstring describes the method and its parameters.

## Writing Docstrings

**For both classes and methods:**

- Use triple quotes (`"""`) to enclose the docstring
- Place the docstring immediately after the class or method definition
- Follow a consistent style (e.g., [Google-style](https://sphinxcontrib-napoleon.readthedocs.io/en/latest/example_google.html))

**For classes:**

- Describe the purpose of the class
- List and explain attributes

**For methods:**

- Use a one-line description for simple methods
- For complex methods:
  - Describe what the method does
  - List and explain parameters (`Args:`)
  - Describe the return value (`Returns:`)
  - Mention any exceptions raised (`Raises:`)

## Using Docstrings

```python
# Print the class docstring
print(SuperHero.__doc__)

# Get help on the whole class (includes docstrings of class and methods)
help(SuperHero)

# Print a method's docstring
print(SuperHero.take_damage.__doc__)
```

By adding docstrings, you make your code more understandable for future users, including yourself.
