/// <reference path="../Extern/Test.ts"/>
/// <reference path="../Source/Grammer.ts"/>

namespace Abitvin
{
    new Test("Grammer syntax")
        .it("Any char", (assert, done) =>
        {
            const code = "abcdefg";
            
            const fn = (b, l) => {
                assert(l === "abcdefg");
                return [true, false, false, true];
            };
            
            const g = new Grammer<boolean, void>();
            g.add("any-char", ".......", fn);
            const result = g.scan("any-char", code); 

            assert(result.isSuccess);
            assert(result.branches[0] === true);
            assert(result.branches[1] === false);
            assert(result.branches[2] === false);
            assert(result.branches[3] === true);
            done();
        })
        .it("All except these characters", (assert, done) =>
        {
            const code = "abc";
            
            const fn = (b, l) => {
                assert(l === "abc");
                return [0, 1, 2, 3];
            };
            
            const g = new Grammer<number, void>();
            g.add("all-except", "[^ABCD]");
            g.add("root", "<all-except>{3}", fn);
            
            const result = g.scan("root", code);

            assert(result.isSuccess);
            assert(result.branches[0] === 0);
            assert(result.branches[1] === 1);
            assert(result.branches[2] === 2);
            assert(result.branches[3] === 3);
            done();
        })
        .it("Alter lexeme", (assert, done) =>
        {
            const code = "\\<東\\<💝\\>中\\>"; // There are gonna be 7 replacements.
            
            const fn = (b, l) => {
                assert(l === "<AAA<BBB>CCC>");
                return [111, 222];
            };

            const g = new Grammer<number, void>();
            g.add("alternations", "(~\\\\<,\\<|\\\\>,\\>|東,AAA|💝,BBB|中,CCC)");
            g.add("root", "<alternations>{7}", fn);
            
            const result = g.scan("root", code);

            assert(result.isSuccess);
            assert(result.branches[0] === 111);
            assert(result.branches[1] === 222);
            done();
        })
        .it("Any of", (assert, done) =>
        {
            const code = "aaabbbccc";
            
            const aaaFn = (b, l) => {
                assert(l === "aaa");
                return 111;
            }; 
            
            const bbbFn = (b, l) => {
                assert(l === "bbb");
                return 222;
            };
            
            let cccFn = (b, l) => {
                assert(l === "ccc");
                return 333;
            };
            
            const g = new Grammer<number, void>();
            g.add("aaa", "aaa", aaaFn);
            g.add("bbb", "bbb", bbbFn);
            g.add("ccc", "ccc", cccFn);
            g.add("any-of-these", "(<aaa>|<bbb>|<ccc>)");
            g.add("root", "<any-of-these>{3}");

            const result = g.scan("root", code);
            
            assert(result.isSuccess);
            assert(result.branches[0] === 111);
            assert(result.branches[1] === 222);
            assert(result.branches[2] === 333);
            done();
        })
        .it("At least", (assert, done) =>
        {
            const code = "xxxx";
            
            const g = new Grammer<number, void>();
            g.add("x", "x", () => 10);
            g.add("at-least-3", "<x>{3,}");
            g.add("at-least-4", "<x>{4,}");
            g.add("at-least-5", "<x>{5,}");
            
            let result = g.scan("at-least-3", code);
            assert(result.isSuccess);
            assert(result.branches[0] === 10);
            assert(result.branches[1] === 10);
            assert(result.branches[2] === 10);
            assert(result.branches[3] === 10);

            result = g.scan("at-least-4", code);
            assert(result.isSuccess);
            assert(result.branches[0] === 10);
            assert(result.branches[1] === 10);
            assert(result.branches[2] === 10);
            assert(result.branches[3] === 10);
            
            result = g.scan("at-least-5", code);
            assert(!result.isSuccess);

            done();
        })
        .it("At most", (assert, done) =>
        {
            const code = "yyy";
            
            const g = new Grammer<number, void>();
            g.add("y", "y", () => 14);
            g.add("at-most-2", "<y>{,2}");
            g.add("at-most-3", "<y>{,3}");
            g.add("at-most-4", "<y>{,4}");

            let result = g.scan("at-most-2", code);
            assert(!result.isSuccess);
            
            result = g.scan("at-most-3", code);
            assert(result.isSuccess);
            assert(result.branches[0] === 14);
            assert(result.branches[1] === 14);
            assert(result.branches[2] === 14);

            result = g.scan("at-most-4", code);
            assert(result.isSuccess);
            assert(result.branches[0] === 14);
            assert(result.branches[1] === 14);
            assert(result.branches[2] === 14);
            
            done();
        })
        .it("Between", (assert, done) =>
        {
            const code = "zzz";
            
            const g = new Grammer<number, void>();
            g.add("z", "z", () => 34);
            g.add("between-1-and-3", "<z>{1,3}");
            g.add("between-0-and-10", "<z>{0,10}");
            g.add("between-4-and-5", "<z>{4,5}");
            
            let result = g.scan("between-1-and-3", code);
            assert(result.isSuccess);
            assert(result.branches[0] === 34);
            assert(result.branches[1] === 34);
            assert(result.branches[2] === 34);

            result = g.scan("between-0-and-10", code);
            assert(result.isSuccess);
            assert(result.branches[0] === 34);
            assert(result.branches[1] === 34);
            assert(result.branches[2] === 34);

            result = g.scan("between-4-and-5", code);
            assert(!result.isSuccess);

            done();
        })
        .it("Char range", (assert, done) =>
        {
            const parserFn = (b, l) => {
                let m = 1;
                let n = 0;

                for (let i = b.length - 1; i >= 0; i--) {
                    n += b[i] * m;
                    m *= 16;
                }

                return n;
            };

            const g = new Grammer<number, void>();
            g.add("digit", "[0-9]", (b, l) => l.charCodeAt(0) - 48);
            g.add("af", "[A-F]", (b, l) => l.charCodeAt(0) - 55);
            g.add("hex", "(<digit>|<af>)");
            g.add("parser", "<hex>{1,8}", parserFn);

            let result = g.scan("parser", "A");
            assert(result.isSuccess);
            assert(result.branches[0] === 10);

            result = g.scan("parser", "12345678");
            assert(result.isSuccess);
            assert(result.branches[0] === 305419896);

            result = g.scan("parser", "FF");
            assert(result.isSuccess);
            assert(result.branches[0] === 255);
            
            result = g.scan("parser", "FFFFFFFF");
            assert(result.isSuccess);
            assert(result.branches[0] === 4294967295);
            
            result = g.scan("parser", "FFFFFFFFF");
            assert(!result.isSuccess);

            result = g.scan("parser", "FFxFF");
            assert(!result.isSuccess);
            
            result = g.scan("parser", "");
            assert(!result.isSuccess);
            
            done();
        })
        .it("Eof", (assert, done) =>
        {
            const code = "123";
            
            const g = new Grammer<string, void>();
            g.add("root", "123$", () => ["A", "B"]);

            const result = g.scan("root", code);
            assert(result.isSuccess);
            assert(result.branches[0] === "A");
            assert(result.branches[1] === "B");
            done();
        })
        .it("Exactly", (assert, done) =>
        {
            const code = "..........";
            
            const g = new Grammer<string, void>();
            g.add(".", ".", () => ".");
            g.add("x", "nope", () => "x");
            g.add("test-a", "<.>{10}");
            g.add("test-b", "<.>{9}");
            g.add("test-c", "<.>{11}");
            g.add("test-d", "<.>{10}<x>{0}");

            let result = g.scan("test-a", code);
            assert(result.isSuccess);
            assert(result.branches.length === 10);
            assert(result.branches.every(c => c === "."));

            result = g.scan("test-b", code);
            assert(!result.isSuccess);
            
            result = g.scan("test-c", code);
            assert(!result.isSuccess);

            result = g.scan("test-d", code);
            assert(result.isSuccess);
            assert(result.branches.length === 10);
            assert(result.branches.every(c => c === "."));

            done();
        })
        .it("Literal", (assert, done) =>
        {
            const code = "y̆y̆y̆x̆";
            
            const fn = (b, l) => {
                assert(l === "y̆y̆y̆x̆");
                return [7777, 8888, 9999];
            };

            const g = new Grammer<number, void>();
            g.add("lit-a", "y̆y̆");
            g.add("lit-b", "y̆");
            g.add("lit-c", "x̆");
            g.add("root", "<lit-a><lit-b><lit-c>", fn);

            const result = g.scan("root", code);

            assert(result.isSuccess);
            assert(result.branches[0] === 7777);
            assert(result.branches[1] === 8888);
            assert(result.branches[2] === 9999);

            done();
        })
        .it("Maybe", (assert, done) =>
        {
            const codes = [
                "xxx",
                "...xxx",
                "xxx...",
                "...xxx...",
            ];
            
            const g = new Grammer<string, void>();
            g.add("dots", "\\.\\.\\.");
            g.add("xxx", "xxx", () => "x");
            g.add("root", "<dots>?<xxx><dots>?");
            
            for (let c of codes) {
                const result = g.scan("root", c);
                assert(result.isSuccess);
                assert(result.branches.length === 1);
                assert(result.branches[0] === "x");
            }

            done();
        })
        .it("None or many", (assert, done) =>
        {
            const g = new Grammer<boolean, void>();
            g.add("dot", "\\.", () => true);
            g.add("x", "x", () => false);

            g.add("code1", "<dot>*<x>*<dot>*", (b, l) => 
            {
                assert(b.length === 0);
                assert(l === "");
                return [];
            });
            
            g.add("code2", "<dot>*<x>*<dot>*", (b, l) => 
            {
                assert(b.length === 1);
                assert(b[0] === false);
                assert(l === "x");
                return [];
            });
            
            g.add("code3", "<dot>*<x>*<dot>*", (b, l) =>
            {
                assert(b.length === 2);
                assert(b[0] === true);
                assert(b[1] === true);
                assert(l === "..");
                return [];
            });
            
            g.add("code4", "<dot>*<x>*<dot>*", (b, l) =>
            {
                assert(b.length === 3);
                assert(b[0] === false);
                assert(b[1] === false);
                assert(b[2] === true);
                assert(l === "xx.");
                return [];
            });
            
            g.add("code5", "<dot>*<x>*<dot>*", (b, l) =>
            {
                assert(b.length === 4);
                assert(b[0] === true);
                assert(b[1] === true);
                assert(b[2] === false);
                assert(b[3] === false);
                assert(l === "..xx");
                return [];
            });
            
            const result1 = g.scan("code1", "");
            assert(result1.isSuccess); 

            const result2 = g.scan("code2", "x");
            assert(result2.isSuccess);

            const result3 = g.scan("code3", "..");
            assert(result3.isSuccess);

            const result4 = g.scan("code4", "xx.");
            assert(result4.isSuccess);

            const result5 = g.scan("code5", "..xx");
            assert(result5.isSuccess);
            
            done();
        })
        .it("Not", (assert, done) =>
        {
            const g = new Grammer<void, void>();
            g.add("not-this", "not this");
            g.add("root", "aaa!<not-this>bbbccc");

            const result1 = g.scan("root", "aaabbbccc");
            assert(result1.isSuccess);

            const result2 = g.scan("root", "aaanot thisbbbccc");
            assert(!result2.isSuccess);
            
            done();
        })
        .it("One", (assert, done) =>
        {
            const code = "onetwothree";
            
            const g = new Grammer<number, void>();
            g.add("one", "one", () => 1);
            g.add("two", "two", () => 2);
            g.add("three", "three", () => 3);
            g.add("root", "<one><two><three>");

            const result = g.scan("root", code);
            assert(result.isSuccess);
            assert(result.branches.length === 3);
            assert(result.branches[0] === 1);
            assert(result.branches[1] === 2);
            assert(result.branches[2] === 3);

            done();
        });
}