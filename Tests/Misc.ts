/// <reference path="../Extern/Test.ts"/>
/// <reference path="../Source/Grammar.ts"/>

namespace Abitvin
{
    new Test("Misc")
        .it("Calc", (assert, done) =>
        {
            const g = new Grammar<number, void>();
            g.declare("expr", "add", "mul");
            g.add("digit", "[0-9]");
            g.add("num", "<digit>+", (b, l) => parseFloat(l));
            g.add("brackets", "\\(<expr>\\)");
            g.add("mul", "(<num>|<brackets>)(\\*<mul>)?", (b, l) => b.length === 1 ? b[0] : b[0] * b[1]);
            g.add("add", "<mul>(\\+<add>)?", (b, l) => b.length === 1 ? b[0] : b[0] + b[1]);
            g.add("expr", "(<add>|<brackets>)");

            let result = g.scan("expr", "2*(3*4*5)");
            assert(result.isSuccess);
            assert(result.branches[0] === 120);

            result = g.scan("expr", "2*(3+4)*5");
            assert(result.isSuccess);
            assert(result.branches[0] === 70);

            result = g.scan("expr", "((2+3*4+5))");
            assert(result.isSuccess);
            assert(result.branches[0] === 19);

            done();
        });
}