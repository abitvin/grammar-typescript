﻿module Abitvin.ByteScript
{
    interface IParseContext 
    {
        astNode?: IAstNode;
        backupAstNode?: IAstNode;
        backupAstNode2?: IAstNode;
        backupId?: string;
        id?: string;
        kind?: Kind;
        lexeme?: string;
        numArguments?: number;
		parameters?: string[];
        precedence?: number;
        rightAssociativity?: boolean;
    }

    interface IToRpnContext
    {
        index: number;
        rpn: IParseContext[];
    }

    enum Kind
    {
        Add,
        Divide,
        Equals,
        Expression,
        Function,
        GetAtIndex,
        GetAtKey,
        GetAtScope,
        GreaterThen,
        GroupBegin,
        GroupEnd,
        Identifier,
        Inverse,
        InvokeFunction,
        Literal,
        LogicalAnd,
        LogicalOr,
        Module,
        Multiply,
        Power,
        Range,
        RangeFrom,
        RangeTo,
        SmallerThen,
        Substract,
    }

    export class Compiler
    {
        private static _initialized: boolean = false;
        private static _rootRule: Rule<IParseContext>;
        private static _variables: { [id: string]: IVariable };

        public static compile( code: string ): IAstNode
        {
            if( !Compiler._initialized )
                Compiler.initialize();

            try
            {
                var branch = new AstNode.Branch( Compiler._rootRule.scan( code ).map( n => n.astNode ) );
                var mainDef = new AstNode.Function({ parameters: [], branch: branch });
                var assign = new AstNode.AssignmentAtScope( "main", mainDef );
                var getVar = new AstNode.GetVariableAtScope( "main" );
                var mainCall = new AstNode.FunctionCall( "main", getVar, [] );
                
                return new AstNode.Branch([ assign, mainCall ]);
            }
            catch (e)
            {
                throw e;
            }
        }

        private static initialize(): void
        {
            var toRpn = (nodes: IParseContext[], ctx: IToRpnContext): void => 
            {
                var opStack: IParseContext[] = [];
                var lastOp: IParseContext = null;
                var exitLoop: boolean = false;

                while( !exitLoop && ctx.index < nodes.length )
                {
                    var n: IParseContext = nodes[ctx.index];

                    switch( n.kind )
                    {
                        case Kind.Expression:
                        case Kind.Function:
                        case Kind.Identifier:
                        case Kind.Literal:
                        {
                            ctx.rpn.push( n );
                            ctx.index++;
                            break;
                        }

                        case Kind.GroupBegin:
                        {
                            ctx.index++;
                            toRpn( nodes, ctx );
                            break;
                        }

                        case Kind.GroupEnd:
                        {
                            exitLoop = true;
                            ctx.index++;
                            break;
                        }

                        default:
                        {
                            if( opStack.length === 0 )
                            {
                                lastOp = n;
                                opStack.push( n );
                            }
                            else
                            {
                                if( n.precedence < lastOp.precedence )
                                {
                                    while( opStack.length > 0 )
                                        ctx.rpn.push( opStack.pop() );
                                }
                                else if( n.precedence === lastOp.precedence && !n.rightAssociativity )
                                {
                                    ctx.rpn.push( opStack.pop() );
                                }
                    
                                lastOp = n;
                                opStack.push( n );
                            }

                            ctx.index++;
                        }
                    }
                };

                while( opStack.length > 0 )
                    ctx.rpn.push( opStack.pop() );
            };

            var buildAst = (nodes: IParseContext[], lexeme: string): IParseContext[] => 
            {
                var ctx: IToRpnContext = { index: 0, rpn: [] };
                toRpn( nodes, ctx );

                var id: string;
                var stack: IParseContext[] = [];

                ctx.rpn.forEach( n =>
                {
                    if( n.kind === Kind.Expression || n.kind === Kind.Function || n.kind === Kind.Identifier || n.kind === Kind.Literal )
                    {
                        stack.push( n );
                    }
                    else
                    {
                        // TODO: Should we change this to a switch statement?
                        if( n.kind === Kind.GetAtIndex )
                        {
                            var index: IAstNode = stack.pop().astNode;
                            var v: IAstNode = stack.pop().astNode;

                            stack.push({ 
                                astNode: new AstNode.GetVariableAtIndex( v, index ), 
                                backupAstNode: v,
                                backupAstNode2: index,
                                kind: Kind.GetAtIndex
                            });
                        }
                        else if( n.kind === Kind.GetAtKey )
                        {
                            id = stack.pop().id;
                            var node = stack.pop().astNode;

                            stack.push({ 
                                astNode: new AstNode.GetVariableAtKey( node, id ), 
                                backupAstNode: node,
                                backupId: id,
                                kind: Kind.GetAtKey
                            });
                        }
                        else if( n.kind === Kind.GetAtScope )
                        {
                            id = stack.pop().id;

                            stack.push({ 
                                astNode: new AstNode.GetVariableAtScope( id ), 
                                backupId: id, 
                                kind: Kind.GetAtScope
                            });
                        }
                        else if( n.kind === Kind.Inverse )
                        {
                            stack.push({ astNode:  new AstNode.Inverse( stack.pop().astNode ) });
                        }
                        else if( n.kind === Kind.InvokeFunction )
                        {
                            var args: IAstNode[] = [];

                            while( n.numArguments-- > 0 )
                                args.push( stack.pop().astNode );

                            // TODO: Sometimes it's not anonymous, when for example it's not directly returned.
                            stack.push({ astNode: new AstNode.FunctionCall( "<anonymous>", stack.pop().astNode, args ) });
                        }
                        else if( n.kind === Kind.Range )
                        {
                            var end: IAstNode = stack.pop().astNode;
                            var start: IAstNode = stack.pop().astNode;
                            var lhs: IAstNode = stack.pop().astNode;

                            stack.push({ astNode: new AstNode.Range( lhs, start, end ) });
                        }
                        else
                        {
                            var right: IAstNode = stack.pop().astNode;
                            var left: IAstNode = stack.pop().astNode;
                        
                            switch( n.kind )
                            {
                                case Kind.Add: stack.push({ astNode: new AstNode.Addition( left, right ) }); break;
                                case Kind.Divide: stack.push({ astNode: new AstNode.Divide( left, right ) }); break;
                                case Kind.Equals: stack.push({ astNode: new AstNode.Equals( left, right ) }); break;
                                case Kind.GreaterThen: stack.push({ astNode: new AstNode.GreaterThen( left, right ) }); break;
                                case Kind.LogicalAnd: stack.push({ astNode: new AstNode.LogicalAnd( left, right ) }); break;
                                case Kind.LogicalOr: stack.push({ astNode: new AstNode.LogicalOr( left, right ) }); break;
                                case Kind.Module: stack.push({ astNode: new AstNode.Modules( left, right ) }); break;
                                case Kind.Multiply: stack.push({ astNode: new AstNode.Multiply( left, right ) }); break;
                                case Kind.Power: stack.push({ astNode: new AstNode.Power( left, right ) }); break;
                                case Kind.RangeFrom: stack.push({ astNode: new AstNode.RangeFrom( left, right ) }); break;
                                case Kind.RangeTo: stack.push({ astNode: new AstNode.RangeTo( left, right ) }); break;
                                case Kind.SmallerThen: stack.push({ astNode: new AstNode.SmallerThen( left, right ) }); break;
                                case Kind.Substract: stack.push({ astNode: new AstNode.Substract( left, right ) }); break;
                            }
                        }
                    }
                });

                var last: IParseContext = stack.pop();
                last.kind = Kind.Expression;
                last.lexeme = lexeme;
                return [last];
            };

            var assignmentStmtNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
            {
                var ctx: IToRpnContext = { index: 0, rpn: [] };
                toRpn( nodes, ctx );

                var lhs: IParseContext = nodes[0];

                switch( lhs.astNode.constructor )
                {
                    case AstNode.GetVariableAtKey: return [{ astNode: new AstNode.AssignmentAtKey( lhs.backupAstNode, lhs.backupId, nodes[1].astNode ) }];
                    case AstNode.GetVariableAtIndex: return [{ astNode: new AstNode.AssignmentAtIndex( lhs.backupAstNode, lhs.backupAstNode2, nodes[1].astNode ) }];
                    case AstNode.GetVariableAtScope: return [{ astNode: new AstNode.AssignmentAtScope( lhs.backupId, nodes[1].astNode ) }];
                }

                throw new Error( "Compiler error at assignment." );
            };
            
            var booleanNode = ( n: IParseContext[], lexeme: string ): IParseContext[] =>
				[{ astNode: new AstNode.Boolean( lexeme === "true" ), kind: Kind.Literal }];

            var branchNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.Branch( nodes.map( n => n.astNode ) ) }];

            var commentNode = ( n: IParseContext[], l: string ): IParseContext[] =>
				[];

            var conditionalNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.Conditional( nodes[0].astNode, nodes[1].astNode ) }];

            var funcCallNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.FunctionCall( nodes[0].lexeme, nodes[0].astNode, nodes.splice( 1 ).map( n => n.astNode ) ), kind: Kind.Function }];

            var funcNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				 [{ astNode: new AstNode.Function({ parameters: nodes[0].parameters, branch: nodes[1].astNode }), kind: Kind.Literal }];

            var grpBeginNode = ( n: IParseContext[], l: string ): IParseContext[] =>
				[{ kind: Kind.GroupBegin }];

            var grpEndNode = ( n: IParseContext[], l: string ): IParseContext[] =>
				[{ kind: Kind.GroupEnd }];

            var idNode = ( n: IParseContext[], lexeme: string ): IParseContext[] =>
				[{ id: lexeme }];

            var ifStmtNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.If( nodes.map( n => n.astNode ) ) }];

            var listNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.List( nodes.map( n => n.astNode ) ), kind: Kind.Literal }];

            var numberNode = ( n: IParseContext[], lexeme: string ): IParseContext[] =>
				[{ astNode: new AstNode.Number( parseFloat( lexeme ) ), kind: Kind.Literal }];

            var parametersNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ parameters: nodes.map( n => n.id ) }];

            var printStmtNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.Print( nodes[0].astNode ) }];

            var returnStmtNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.Return( nodes[0].astNode ) }];

            var stringNode = ( n: IParseContext[], lexeme: string ): IParseContext[] =>
				[{ astNode: new AstNode.String( lexeme ), kind: Kind.Literal }];

            // TODO: Initialize variable to the structure.
            var structNode = ( n: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.Struct( false ), kind: Kind.Literal }];

            var variableNode = ( n: IParseContext[], lexeme: string ): IParseContext[] =>
				[{ astNode: new AstNode.Variable( lexeme ), kind: Kind.Identifier }];

            var whileStmtNode = ( nodes: IParseContext[], l: string ): IParseContext[] =>
				[{ astNode: new AstNode.While( nodes[0].astNode, nodes[1].astNode ) }];

            // Operators order by precedence
            // I use the URL below as a reference but the precedence is reversed.
            // http://en.cppreference.com/w/cpp/language/operator_precedence

            var opLogicalOrNode = (): IParseContext[] =>
				[{ kind: Kind.LogicalOr, precedence: 1 }];

            var opLogicalAndNode = (): IParseContext[] =>
				[{ kind: Kind.LogicalAnd, precedence: 2 }];

            var opEqualsNode = (): IParseContext[] =>
				[{ kind: Kind.Equals, precedence: 3 }];

            var opGreaterThenNode = (): IParseContext[] =>
				[{ kind: Kind.GreaterThen, precedence: 4 }];

            var opSmallerThenNode = (): IParseContext[] =>
				[{ kind: Kind.SmallerThen, precedence: 4 }];

            var opAddNode = (): IParseContext[] =>
				[{ kind: Kind.Add, precedence: 5 }];

            var opSubNode = (): IParseContext[] =>
				[{ kind: Kind.Substract, precedence: 5 }];

            var opDivNode = (): IParseContext[] =>
				[{ kind: Kind.Divide, precedence: 6 }];

            var opModNode = (): IParseContext[] =>
				[{ kind: Kind.Module, precedence: 6 }];

            var opMulNode = (): IParseContext[] =>
				[{ kind: Kind.Multiply, precedence: 6 }];
            
            var opPowNode = (): IParseContext[] =>
				[{ kind: Kind.Power, precedence: 7, rightAssociativity: true }];

            var opInverseNode = (): IParseContext[] =>
				[{ kind: Kind.Inverse, precedence: 8 }];

            var opGetAtIndexNode = ( nodes: IParseContext[] ): IParseContext[] =>
				[{ kind: Kind.GetAtIndex, precedence: 9 }, nodes[0]];
            
            var opGetAtKeyNode = ( nodes: IParseContext[] ): IParseContext[] =>
				[{ kind: Kind.GetAtKey, precedence: 9 }, { kind: Kind.Identifier, id: nodes[0].id }];
            
            var opGetAtScopeNode = ( nodes: IParseContext[] ): IParseContext[] =>
				[{ kind: Kind.GetAtScope, precedence: 9 }, { kind: Kind.Identifier, id: nodes[0].id }];
            
            var opInvokeFuncNode = ( nodes: IParseContext[] ): IParseContext[] =>
				(nodes.unshift({ kind: Kind.InvokeFunction, numArguments: nodes.length, precedence: 9 }), nodes);
            
            var opRangeNode = ( nodes: IParseContext[] ): IParseContext[] =>
				[{ kind: Kind.Range, precedence: 9 }, nodes[0], nodes[1]];
            
            var opRangeFromNode = ( nodes: IParseContext[] ): IParseContext[] =>
				[{ kind: Kind.RangeFrom, precedence: 9 }, nodes[0]];

            var opRangeToNode = ( nodes: IParseContext[] ): IParseContext[] =>
				[{ kind: Kind.RangeTo, precedence: 9 }, nodes[0]];
            
            // Predefines
            var expr = new Rule<IParseContext>( buildAst );
            var stmt = new Rule<IParseContext>();
            var funcCallStmt = new Rule<IParseContext>( funcCallNode );

            // Common
            var zero = new Rule<IParseContext>().literal( "0" );
			var nonZeroDigit = new Rule<IParseContext>().between( "1", "9" );
			var digit = new Rule<IParseContext>().between( "0", "9" );
            var az = new Rule<IParseContext>().between( "a", "z" );
            var ws = new Rule<IParseContext>().anyOf([ " ", "\t" ]);
            var eol = new Rule<IParseContext>().anyOf([ "\r\n", "\n", "\r" ]);
            var emptyLine = new Rule<IParseContext>().noneOrMany( ws ).one( eol );
            var branch = new Rule<IParseContext>( branchNode ).noneOrMany( stmt );
            var end = new Rule<IParseContext>().noneOrMany( ws ).literal( "end" );

            // Comment
            var commentChar = new Rule<IParseContext>().allExcept([ "\n", "\r" ]);
            var comment = new Rule<IParseContext>( commentNode ).literal( "//" ).noneOrMany( commentChar );

			// Identifier, variable and types
			var bool = new Rule<IParseContext>( booleanNode ).anyOf([ "false", "true" ]);
            var id = new Rule<IParseContext>( idNode ).atLeastOne( az );
			var signedInteger = new Rule<IParseContext>().maybe( "-" ).one( nonZeroDigit ).noneOrMany( digit );
			var variable = new Rule<IParseContext>( variableNode ).atLeastOne( az );
            var integer = new Rule<IParseContext>().anyOf([ zero, signedInteger ]);
            var decimalFraction = new Rule<IParseContext>().literal( "." ).atLeastOne( digit );
			var numbr = new Rule<IParseContext>( numberNode ).one( integer ).maybe( decimalFraction );
            
            var strEscape = new Rule<IParseContext>().alter([ "\\\"", "\"" ]);
            var strAllExcept = new Rule<IParseContext>().allExcept([ "\"" ]);
            var strChar = new Rule<IParseContext>().anyOf([ strEscape, strAllExcept ]);
            var strValue = new Rule<IParseContext>( stringNode ).noneOrMany( strChar );
            var str = new Rule<IParseContext>().literal( "\"" ).one( strValue ).literal( "\"" );

            var listLoop = new Rule<IParseContext>().noneOrMany( ws ).literal( "," ).noneOrMany( ws ).one( expr );
            var listStart = new Rule<IParseContext>().noneOrMany( ws ).one( expr ).noneOrMany( listLoop ).noneOrMany( ws );
            var list = new Rule<IParseContext>( listNode ).literal( "[" ).maybe( listStart ).literal( "]" );

            var struct = new Rule<IParseContext>( structNode ).literal( "{}" );

            var funcArgumentsLoop = new Rule<IParseContext>().noneOrMany( ws ).literal( "," ).noneOrMany( ws ).one( expr );
            var funcArguments = new Rule<IParseContext>().noneOrMany( ws ).one( expr ).noneOrMany( funcArgumentsLoop ).noneOrMany( ws );
            var funcOp = new Rule<IParseContext>( opInvokeFuncNode ).literal( "(" ).maybe( funcArguments ).literal( ")" );

            var funcParametersLoop = new Rule<IParseContext>().atLeastOne( ws ).one( id );
            var funcParametersStart = new Rule<IParseContext>().noneOrMany( ws ).one( id ).noneOrMany( funcParametersLoop ).noneOrMany( ws );
            var funcParameters = new Rule<IParseContext>( parametersNode ).maybe( funcParametersStart );
            var func = new Rule<IParseContext>( funcNode ).literal( "fn" ).noneOrMany( ws ).literal( "(" ).one( funcParameters ).literal( ")" ).one( eol ).one( branch ).one( end );

            // Get variable.
			var atIndex = new Rule<IParseContext>().literal( "[" ).noneOrMany( ws ).one( expr ).noneOrMany( ws ).literal( "]" );
            var atKey = new Rule<IParseContext>().literal( "." ).one( id );
            var atScope = new Rule<IParseContext>().one( id );

            var opGetAtIndex = new Rule<IParseContext>( opGetAtIndexNode ).one( atIndex );
            var opGetAtKey = new Rule<IParseContext>( opGetAtKeyNode ).one( atKey );
            var opGetAtScope = new Rule<IParseContext>( opGetAtScopeNode ).one( atScope );
            var getAtIndexOrKey = new Rule<IParseContext>().anyOf([ opGetAtIndex, opGetAtKey ]);
            var getVar = new Rule<IParseContext>( buildAst ).one( opGetAtScope ).noneOrMany( getAtIndexOrKey );
            
            // Expression group
            var grpBegin = new Rule<IParseContext>( grpBeginNode ).literal( "(" );
            var grpEnd = new Rule<IParseContext>( grpEndNode ).literal( ")" );

            // Mathematical operators
            var opAdd = new Rule<IParseContext>( opAddNode ).noneOrMany( ws ).literal( "+" );
            var opDiv = new Rule<IParseContext>( opDivNode ).noneOrMany( ws ).literal( "/" );
            var opMod = new Rule<IParseContext>( opModNode ).noneOrMany( ws ).literal( "%" );
            var opMul = new Rule<IParseContext>( opMulNode ).noneOrMany( ws ).literal( "*" );
            var opPow = new Rule<IParseContext>( opPowNode ).noneOrMany( ws ).literal( "^" );
            var opSub = new Rule<IParseContext>( opSubNode ).noneOrMany( ws ).literal( "-" );

            // Unary operations
            var opInverse = new Rule<IParseContext>( opInverseNode ).literal( "-" );
            
            // Range operations
            var opRange = new Rule<IParseContext>( opRangeNode ).literal( "[" ).noneOrMany( ws ).one( expr ).noneOrMany( ws ).literal( ".." ).noneOrMany( ws ).one( expr ).noneOrMany( ws ).literal( "]" );
            var opRangeFrom = new Rule<IParseContext>( opRangeFromNode ).literal( "[" ).one( expr ).noneOrMany( ws ).literal( ".." ).noneOrMany( ws ).literal( "]" );
            var opRangeTo = new Rule<IParseContext>( opRangeToNode ).literal( "[" ).noneOrMany( ws ).literal( ".." ).one( expr ).literal( "]" );

            // Relational operators
            var opEq = new Rule<IParseContext>( opEqualsNode ).noneOrMany( ws ).literal( "==" );
            var opGt = new Rule<IParseContext>( opGreaterThenNode ).noneOrMany( ws ).literal( ">" );
            var opSt = new Rule<IParseContext>( opSmallerThenNode ).noneOrMany( ws ).literal( "<" );

            // Logical operators
            var opLAnd = new Rule<IParseContext>( opLogicalAndNode ).atLeastOne( ws ).literal( "and " );
            var opLOr = new Rule<IParseContext>( opLogicalOrNode ).atLeastOne( ws ).literal( "or " );
            
            // Expressions
            var getOpsOrFuncInvocation = new Rule<IParseContext>().anyOf([ opGetAtIndex, opGetAtKey, opRange, opRangeFrom, opRangeTo, funcOp ]);
            var operand = new Rule<IParseContext>();
            var operation = new Rule<IParseContext>().anyOf([ opAdd, opDiv, opMod, opMul, opPow, opSub, opEq, opLAnd, opLOr, opGt, opSt ]).noneOrMany( ws ).one( operand );
            var exprLoop = new Rule<IParseContext>().one( operand ).noneOrMany( operation );
            var exprGroup = new Rule<IParseContext>().one( grpBegin ).noneOrMany( ws ).one( exprLoop ).noneOrMany( ws ).one( grpEnd );
            var unaryble = new Rule<IParseContext>().maybe( opInverse ).anyOf([ variable, exprGroup ]);
            operand.anyOf([ bool, numbr, list, str, func, struct, unaryble ]).noneOrMany( getOpsOrFuncInvocation );
            expr.one( exprLoop );
            
            // Print statement
            var printStmt = new Rule<IParseContext>( printStmtNode ).literal( "print" ).atLeastOne( ws ).one( expr );

            // Assigment statement
            var assignmentStmt = new Rule<IParseContext>( assignmentStmtNode ).one( getVar ).noneOrMany( ws ).literal( "=" ).noneOrMany( ws ).one( expr );

            // If statement
            var elseStmt = new Rule<IParseContext>().noneOrMany( ws ).literal( "else" ).noneOrMany( ws ).one( eol ).one( branch );
            var elseIfStmt = new Rule<IParseContext>( conditionalNode ).noneOrMany( ws ).literal( "else if" ).atLeastOne( ws ).one( expr ).noneOrMany( ws ).one( eol ).one( branch );
            var ifStmt = new Rule<IParseContext>( conditionalNode ).literal( "if" ).atLeastOne( ws ).one( expr ).noneOrMany( ws ).one( eol ).one( branch );
            var ifStmtRoot = new Rule<IParseContext>( ifStmtNode ).one( ifStmt ).noneOrMany( elseIfStmt ).maybe( elseStmt ).one( end );

            // While statement
			var whileStmt = new Rule<IParseContext>( whileStmtNode ).literal( "while" ).atLeastOne( ws ).one( expr ).noneOrMany( ws ).one( eol ).one( branch ).one( end );

            // Function invocement
            funcCallStmt.one( getVar ).literal( "(" ).maybe( funcArguments ).literal( ")" );
            
            // Return statement
            var returnStmt = new Rule<IParseContext>( returnStmtNode ).literal( "return" ).atLeastOne( ws ).one( expr );

            // Any statement (implementation)
            stmt.noneOrMany( ws ).anyOf([ emptyLine, comment, assignmentStmt, funcCallStmt, ifStmtRoot, printStmt, returnStmt, whileStmt ]).noneOrMany( ws ).maybe( eol );

            // Root
            this._rootRule = new Rule<IParseContext>().atLeastOne( stmt );
        }
    }
} 