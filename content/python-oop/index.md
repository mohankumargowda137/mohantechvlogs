---
title: "Python OOP: Object-Oriented Programming"
subtitle: Classes, objects, encapsulation, inheritance, polymorphism and abstraction in Python, explained with one running superhero example.
thumbnail: thumbnail.svg
order: 5
date: 2026-11-09
tags: [python, oop, classes, inheritance, beginner]
draft: true                   # remove when ready to publish

sections:
  - title: Classes and Objects
    description: "Blueprints, objects, attributes, methods, self, __init__ and docstrings."
    blogs:
      - folder: 01-class
      - folder: 02-objects
      - folder: 03-object-attributes
      - folder: 04-object-methods
      - folder: 05-self-parameter
      - folder: 06-init-method
      - folder: 07-docstrings
  - title: Encapsulation
    description: "Public, protected and private members, getters, setters and @property."
    blogs:
      - folder: 08-public-members
      - folder: 09-protected-members
      - folder: 10-private-members
      - folder: 11-getters-and-setters
      - folder: 12-property-decorator
  - title: Class Attributes
    description: "Data and methods that belong to the class itself, not to one object."
    blogs:
      - folder: 13-class-attributes
      - folder: 14-class-vs-instance-attributes
      - folder: 15-class-methods
      - folder: 16-static-methods
  - title: Inheritance
    description: "Reusing a parent class, overriding methods, super(), multiple inheritance and MRO."
    blogs:
      - folder: 17-inheritance-basics
      - folder: 18-method-overriding
      - folder: 19-super-function
      - folder: 20-multiple-inheritance
      - folder: 21-diamond-problem-mro
  - title: Polymorphism
    description: "One interface, many forms: overriding, overloading-style methods and duck typing."
    blogs:
      - folder: 22-polymorphism
      - folder: 23-method-overloading
      - folder: 24-duck-typing
  - title: Abstraction
    description: "Hiding details, abstract classes and interfaces with the abc module."
    blogs:
      - folder: 25-abstraction
      - folder: 26-abstract-classes
      - folder: 27-interfaces
---

**New to object-oriented programming? Start here.** This series assumes you can write basic Python
(variables, functions, lists) and walks through OOP one small idea per blog: what classes and objects
are, how `self` and `__init__` work, how to protect an object's data, how to share data across a class,
how inheritance and `super()` let you reuse code, how polymorphism and duck typing work, and how
abstract classes and interfaces define contracts.

Most examples use the same `SuperHero` class, so each blog builds on the one before it.
