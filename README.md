Grammer
=======

About
-----
The Grammer API is a parser combinator written in TypeScript which offers infinite look ahead scanning and were the rules are build using a regexp-like language.
You parse a string into a generic T. Where T is a custom defined data structure for example an AST or a number. 

You can use Grammer for:
* Creating a programming language syntax and parse an AST out of it.
* Making different parsers for different Unicode text based file formats.
* Writing a calculator with correct operator precedence with a few lines of code.
* A text comparer, like a regexp alternative.
* Much more...

Building
--------
This project is build within Visual Studio Code and a installation of TypeScript 1.8 in the default directory.
If your install path of TypeScript is different then the default path then you should change the path in the ".vscode/tasks.json" file.
If everything is set, just press CTRL+SHIFT+B to build.

License
-------
This project is licensed under the MIT license.