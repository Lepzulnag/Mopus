'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var MagicString = _interopDefault(require('../magic-string/index.js'));
var sourcemapCodec = require('../sourcemap-codec/index.js');
var parser = require('../acorn/acorn.js').parse

function parse$1 ( source ) {
	return parser( source, {
		ecmaVersion: 8,
		preserveParens: true,
		sourceType: 'module',
		allowReserved: true,
		allowReturnOutsideFunction: true,
		// locations: true,
	});
}

var UNKNOWN = {};

function locate ( source, index ) {
	var lines = source.split( '\n' );
	var len = lines.length;

	var lineStart = 0;
	var i;

	for ( i = 0; i < len; i += 1 ) {
		var line = lines[i];
		var lineEnd =  lineStart + line.length + 1; // +1 for newline

		if ( lineEnd > index ) {
			return { line: i + 1, column: index - lineStart, char: i };
		}

		lineStart = lineEnd;
	}

	throw new Error( 'Could not determine location of character' );
}

function pad ( num, len ) {
	var result = String( num );
	return result + repeat( ' ', len - result.length );
}

function repeat ( str, times ) {
	var result = '';
	while ( times-- ) { result += str; }
	return result;
}

function getSnippet ( source, loc, length ) {
	if ( length === void 0 ) length = 1;

	var first = Math.max( loc.line - 5, 0 );
	var last = loc.line;

	var numDigits = String( last ).length;

	var lines = source.split( '\n' ).slice( first, last );

	var lastLine = lines[ lines.length - 1 ];
	var offset = lastLine.slice( 0, loc.column ).replace( /\t/g, '  ' ).length;

	var snippet = lines
		.map( function ( line, i ) { return ((pad( i + first + 1, numDigits )) + " : " + (line.replace( /\t/g, '  '))); } )
		.join( '\n' );

	snippet += '\n' + repeat( ' ', numDigits + 3 + offset ) + repeat( '^', length );

	return snippet;
}

var CompileError = (function (Error) {
	function CompileError ( node, message ) {
		Error.call(this);

		var source = node.program.magicString.original;
		var loc = locate( source, node.start );

		this.name = 'CompileError';
		this.message = message + " (" + (loc.line) + ":" + (loc.column) + ")";

		this.stack = new Error().stack.replace( new RegExp( (".+new " + (this.name) + ".+\\n"), 'm' ), '' );

		this.loc = loc;
		this.pos = loc.char;
		this.snippet = getSnippet( source, loc, node.end - node.start );
	}

	if ( Error ) CompileError.__proto__ = Error;
	CompileError.prototype = Object.create( Error && Error.prototype );
	CompileError.prototype.constructor = CompileError;

	return CompileError;
}(Error));

var Node = function Node () {};

Node.prototype.ancestor = function ancestor ( level ) {
	var node = this;
	while ( level-- ) {
		node = node.parent;
		if ( !node ) { return null; }
	}

	return node;
};

Node.prototype.append = function append ( code, content ) {
	code.appendLeft( this.getRightHandSide().end, content );
};

Node.prototype.attachScope = function attachScope ( program, scope ) {
		var this$1 = this;

	for ( var i$1 = 0, list = this$1.keys; i$1 < list.length; i$1 += 1 ) {
		var key = list[i$1];

			var value = this$1[ key ];

		if ( value ) {
			if ( 'length' in value ) {
				var i = value.length;
				while ( i-- ) {
					if ( value[i] ) { value[i].attachScope( program, scope ); }
				}
			} else {
				value.attachScope( program, scope );
			}
		}
	}
};

Node.prototype.canSequentialise = function canSequentialise () {
	return false;
};

Node.prototype.contains = function contains ( node ) {
		var this$1 = this;

	while ( node ) {
		if ( node === this$1 ) { return true; }
		node = node.parent;
	}

	return false;
};

Node.prototype.error = function error ( message ) {
	throw new CompileError( this, message );
};

Node.prototype.getLeftHandSide = function getLeftHandSide () {
	return this;
};

Node.prototype.getPrecedence = function getPrecedence () {
	return 0;
};

Node.prototype.getRightHandSide = function getRightHandSide () {
	return this;
};

Node.prototype.getValue = function getValue () {
	return UNKNOWN;
};

Node.prototype.initialise = function initialise ( program, scope ) {
		var this$1 = this;

	this.skip = false;

	for ( var i$1 = 0, list = this$1.keys; i$1 < list.length; i$1 += 1 ) {
		var key = list[i$1];

			var value = this$1[ key ];

		if ( value ) {
			if ( 'length' in value ) {
				var i = value.length;
				while ( i-- ) {
					if ( value[i] ) { value[i].initialise( program, scope ); }
				}
			} else {
				value.initialise( program, scope );
			}
		}
	}
};

Node.prototype.isEmpty = function isEmpty () {
	return this.skip;
};

Node.prototype.findVarDeclarations = function findVarDeclarations ( varsToHoist ) {
		var this$1 = this;

	for ( var i$1 = 0, list = this$1.keys; i$1 < list.length; i$1 += 1 ) {
		var key = list[i$1];

			var value = this$1[ key ];

		if ( value ) {
			if ( 'length' in value ) {
				var i = value.length;
				while ( i-- ) {
					if ( value[i] ) { value[i].findVarDeclarations( varsToHoist ); }
				}
			} else {
				value.findVarDeclarations( varsToHoist );
			}
		}
	}
};

Node.prototype.move = function move ( code, position ) {
	code.move( this.getLeftHandSide().start, this.getRightHandSide().end, position );
};

Node.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

	for ( var i$1 = 0, list = this$1.keys; i$1 < list.length; i$1 += 1 ) {
		var key = list[i$1];

			var value = this$1[ key ];

		if ( value ) {
			if ( 'length' in value ) {
				var i = value.length;
				while ( i-- ) {
					if ( value[i] ) { value[i].minify( code, chars ); }
				}
			} else {
				value.minify( code, chars );
			}
		}
	}
};

Node.prototype.parenthesize = function parenthesize ( code ) {
	this.prepend( code, '(' );
	this.append( code, ')' );
};

Node.prototype.prepend = function prepend ( code, content ) {
	code.prependRight( this.getLeftHandSide().start, content );
};

Node.prototype.preventsCollapsedReturns = function preventsCollapsedReturns ( returnStatements ) {
	if ( this.type === 'ExpressionStatement' ) { return false; }
	if ( this.type === 'ReturnStatement' ) { return returnStatements.push( this ), false; }
	if ( this.type === 'IfStatement' ) { return !this.preventsCollapsedReturns( returnStatements ); }
	return true;
};

Node.prototype.source = function source () {
	return this.program.magicString.original.slice( this.start, this.end );
};

Node.prototype.toString = function toString () {
	return this.program.magicString.slice( this.start, this.end );
};

var ArrayExpression = (function (Node$$1) {
	function ArrayExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ArrayExpression.__proto__ = Node$$1;
	ArrayExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ArrayExpression.prototype.constructor = ArrayExpression;

	ArrayExpression.prototype.getValue = function getValue () {
		var this$1 = this;

		var values = new Array( this.elements.length );

		for ( var i = 0; i < this.elements.length; i += 1 ) {
			var element = this$1.elements[i];

			if ( element ) {
				var value = element.getValue();
				if ( value === UNKNOWN ) { return UNKNOWN; }

				values[i] = value;
			}
		}

		return values;
	};

	ArrayExpression.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		var c = this.start;

		if ( this.elements.length ) {
			var insert = '[';
			this.elements.forEach( function ( element, i ) {
				if ( !element ) {
					insert += i === this$1.elements.length - 1 ? ',]' : ',';
					return;
				}

				if ( element.start > c + 1 ) { code.overwrite( c, element.start, insert ); }
				c = element.end;

				insert = i === this$1.elements.length - 1 ? ']' : ',';
			});

			if ( this.end > insert.length ) { code.overwrite( c, this.end, insert ); }
		}

		else {
			if ( this.end > c + 2 ) { code.overwrite( c, this.end, '[]' ); }
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return ArrayExpression;
}(Node));

var reserved = 'do if in for let new try var case else enum eval null this true void with await break catch class const false super throw while yield delete export import public return static switch typeof default extends finally package private continue debugger function arguments interface protected implements instanceof'.split( ' ' );

var reservedLookup = Object.create( null );
reserved.forEach( function (word) {
	reservedLookup[ word ] = true;
});

var letConst = /^(?:let|const)$/;

function Scope ( options ) {
	options = options || {};

	this.parent = options.parent;
	this.canMangle = !!this.parent;
	this.isBlockScope = !!options.block;
	this.useStrict = this.parent && this.parent.useStrict;

	// vars declared in blocks are stored here, so that we
	// can hoist them if those blocks are removed but the
	// declarations are used. TODO an alternative approach
	// would be to replace instances of the hoisted var
	// with `void 0`
	this.varDeclarations = new Set();
	this.hoistedVars = new Set();
	this.varDeclarationNodes = [];

	var scope = this;
	while ( scope.isBlockScope ) { scope = scope.parent; }
	this.functionScope = scope;

	this.identifiers = [];
	this.declarations = Object.create( null );
	this.references = Object.create( null );
	this.blockScopedDeclarations = this.isBlockScope ? null : Object.create( null );
	this.aliases = Object.create( null );

	this.idCounter = [ 0 ];
}

Scope.prototype = {
	addDeclaration: function addDeclaration ( identifier, kind ) {
		if ( kind === 'var' && this.isBlockScope ) {
			this.varDeclarations.add( identifier.name );
			this.parent.addDeclaration( identifier, kind );
			return;
		}

		var name = identifier.name;

		var existingDeclaration = this.declarations[ name ];
		if ( existingDeclaration ) {
			if ( letConst.test( kind ) || letConst.test( existingDeclaration.kind ) ) {
				// TODO warn about double var declarations?
				throw new CompileError( identifier, (name + " is already declared") );
			}

			// special case — function expression IDs that are shadowed by
			// declarations should just be removed (TODO unless the user wishes
			// to keep function names — https://github.com/Rich-Harris/butternut/issues/17)
			if ( existingDeclaration.kind === 'FunctionExpression' ) {
				existingDeclaration.node.parent.shadowed = true;
			}

			else {
				identifier.isDuplicate = true;

				if ( existingDeclaration.activated ) {
					identifier.activate();
				} else {
					existingDeclaration.duplicates.push( identifier );
				}

				return;
			}
		}

		var declaration = {
			activated: !this.parent, // TODO is this necessary?
			name: name,
			node: identifier,
			kind: kind,
			instances: [],
			duplicates: []
		};

		this.declarations[ name ] = declaration;

		if ( this.isBlockScope ) {
			if ( !this.functionScope.blockScopedDeclarations[ name ] ) { this.functionScope.blockScopedDeclarations[ name ] = []; }
			this.functionScope.blockScopedDeclarations[ name ].push( declaration );
		}

		if ( kind === 'param' ) {
			declaration.instances.push( identifier );
		}
	},

	addReference: function addReference ( identifier ) {
		var declaration = this.declarations[ identifier.name ];
		if ( declaration ) {
			declaration.instances.push( identifier );

			if ( !declaration.activated ) {
				declaration.activated = true;
				// const parent = declaration.node.parent;

				declaration.node.activate();
				declaration.duplicates.forEach( function (dupe) {
					dupe.activate();
				});
				// if ( declaration.kind === 'param' ) {
				// 	// TODO is there anything to do here?
				// } else if ( parent.activate ) {
				// 	parent.activate();
				// }
			}
		} else {
			this.references[ identifier.name ] = true;
			if ( this.parent ) { this.parent.addReference( identifier ); }
		}
	},

	contains: function contains ( name ) {
		return this.declarations[ name ] ||
		       ( this.parent ? this.parent.contains( name ) : false );
	},

	deopt: function deopt () {
		var this$1 = this;

		if ( !this.deopted ) {
			this.deopted = true;
			this.canMangle = false;

			if ( this.parent ) { this.parent.deopt(); }

			Object.keys( this.declarations ).forEach( function (name) {
				this$1.declarations[name].node.activate();
			});
		}
	},

	findDeclaration: function findDeclaration ( name ) {
		return this.declarations[ name ] ||
		       ( this.parent && this.parent.findDeclaration( name ) );
	},

	mangle: function mangle ( code, chars ) {
		var this$1 = this;

		if ( !this.canMangle ) { return; }

		var used = Object.create( null );
		reserved.forEach( function (word) {
			used[ word ] = true;
		});

		Object.keys( this.references ).forEach( function (reference) {
			var declaration = this$1.parent && this$1.parent.findDeclaration( reference );
			used[ declaration && declaration.alias || reference ] = true;
		});

		var i = -1;
		function getNextAlias () {
			var alias;

			do {
				i += 1;
				alias = getAlias( chars, i );
			} while ( alias in used );

			return alias;
		}

		// TODO sort declarations by number of instances?

		Object.keys( this.declarations ).forEach( function (name) {
			var declaration = this$1.declarations[ name ];
			if ( declaration.instances.length === 0 ) { return; }

			// special case — function expression IDs may be removed outright
			if ( declaration.node.parent.type === 'FunctionExpression' && declaration.node === declaration.node.parent.id ) {
				if ( declaration.node.shadowed || declaration.instances.length === 1 ) { return; }
			}

			declaration.alias = getNextAlias();

			declaration.instances.forEach( function (instance) {
				var replacement = instance.parent.type === 'Property' && instance.parent.shorthand ?
					((instance.name) + ":" + (declaration.alias)) :
					declaration.alias;

				code.overwrite( instance.start, instance.end, replacement, true );
			});
		});
	}
};

// adapted from https://github.com/mishoo/UglifyJS2/blob/master/lib/scope.js
function getAlias ( chars, i ) {
	var alias = '';
	var base = 54;

	i++;
	do {
		i--;
		alias += chars[ i % base ];
		i = Math.floor( i / base );
		base = 64;
	} while ( i > 0 );

	return alias;
}

function extractNames ( node ) {
	var names = [];
	extractors[ node.type ]( names, node );
	return names;
}

var extractors = {
	Identifier: function Identifier ( names, node ) {
		names.push( node );
	},

	ObjectPattern: function ObjectPattern ( names, node ) {
		for ( var i = 0, list = node.properties; i < list.length; i += 1 ) {
			var prop = list[i];

			extractors[ prop.value.type ]( names, prop.value );
		}
	},

	ArrayPattern: function ArrayPattern ( names, node ) {
		for ( var i = 0, list = node.elements; i < list.length; i += 1 )  {
			var element = list[i];

			if ( element ) { extractors[ element.type ]( names, element ); }
		}
	},

	RestElement: function RestElement ( names, node ) {
		extractors[ node.argument.type ]( names, node.argument );
	},

	AssignmentPattern: function AssignmentPattern ( names, node ) {
		extractors[ node.left.type ]( names, node.left );
	}
};

var ArrowFunctionExpression = (function (Node$$1) {
	function ArrowFunctionExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ArrowFunctionExpression.__proto__ = Node$$1;
	ArrowFunctionExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ArrowFunctionExpression.prototype.constructor = ArrowFunctionExpression;

	ArrowFunctionExpression.prototype.attachScope = function attachScope ( program, parent ) {
		var this$1 = this;

		this.scope = new Scope({
			block: false,
			parent: parent
		});

		this.params.forEach( function (param) {
			param.attachScope( program, this$1.scope );

			extractNames( param ).forEach( function (node) {
				node.declaration = this$1;
				this$1.scope.addDeclaration( node, 'param' );
			});
		});

		if ( this.body.type === 'BlockStatement' ) {
			this.body.body.forEach( function (node) {
				node.attachScope( program, this$1.scope );
			});
		} else {
			this.body.attachScope( program, this.scope );
		}

	};

	ArrowFunctionExpression.prototype.initialise = function initialise ( program ) {
		Node$$1.prototype.initialise.call( this, program, this.scope );
	};

	ArrowFunctionExpression.prototype.findVarDeclarations = function findVarDeclarations () {
		// noop
	};

	ArrowFunctionExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		return this.params.length === 1 ? this.params[0] : this;
	};

	ArrowFunctionExpression.prototype.minify = function minify ( code, chars ) {
		this.scope.mangle( code, chars );

		var c = this.start;
		if ( this.async ) { c += 5; }

		if ( this.params.length === 0 ) {
			if ( this.body.start > c + 4 ) {
				code.overwrite( c, this.body.start, '()=>' );
			}
		}

		else if ( this.params.length === 1 ) {
			this.params[0].minify( code, chars );

			if ( this.params[0].type === 'Identifier' ) {
				// remove parens
				if ( this.async ) {
					code.overwrite( c, this.params[0].start, ' ' );
				} else {
					code.remove( c, this.params[0].start );
				}

				if ( this.body.start > this.params[0].end + 2 ) {
					code.overwrite( this.params[0].end, this.body.start, '=>' );
				}
			} else {
				if ( this.params[0].start > c + 1 ) {
					code.remove( c + 1, this.params[0].start );
				}

				if ( this.body.start > this.params[0].end + 3 ) {
					code.overwrite( this.params[0].end, this.body.start, ')=>' );
				}
			}
		}

		else {
			this.params.forEach( function ( param, i ) {
				param.minify( code, chars );
				if ( param.start > c + 1 ) { code.overwrite( c, param.start, i ? ',' : '(' ); }
				c = param.end;
			});

			if ( this.body.start > c + 3 ) {
				code.overwrite( c, this.body.start, ')=>' );
			}
		}

		this.body.minify( code, chars );
	};

	return ArrowFunctionExpression;
}(Node));

var commutative = {};
// we exclude + because it's not commutative when it's
// operating on strings
for ( var i = 0, list = '*&^|'; i < list.length; i += 1 ) {
	var operator = list[i];

	commutative[ operator ] = true;
}

var collapsibleOperators = '** * / % + - << >> >>> & ^ |'.split( ' ' );

var AssignmentExpression = (function (Node$$1) {
	function AssignmentExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) AssignmentExpression.__proto__ = Node$$1;
	AssignmentExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	AssignmentExpression.prototype.constructor = AssignmentExpression;

	AssignmentExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		return this.left.getLeftHandSide();
	};

	AssignmentExpression.prototype.getPrecedence = function getPrecedence () {
		return 3;
	};

	AssignmentExpression.prototype.initialise = function initialise ( program, scope ) {
		if ( this.left.type === 'Identifier' ) {
			var declaration = scope.findDeclaration( this.left.name );
			if ( declaration && declaration.kind === 'const' ) {
				throw new CompileError( this.left, ((this.left.name) + " is read-only") );
			}
		}

		Node$$1.prototype.initialise.call( this, program, scope );
	};

	AssignmentExpression.prototype.minify = function minify ( code, chars ) {
		if ( this.right.start > this.left.end + this.operator.length ) {
			code.overwrite( this.left.end, this.right.start, this.operator );
		}

		// special case – `a = a + 1` -> `a += 1`
		if ( this.operator === '=' && this.left.type === 'Identifier' && this.right.type === 'BinaryExpression' && ~collapsibleOperators.indexOf( this.right.operator ) ) {
			if ( this.right.left.type === 'Identifier' && ( this.right.left.name === this.left.name ) ) {
				code.appendLeft( this.left.end, this.right.operator );
				code.remove( this.right.start, this.right.right.start );

				this.right.right.minify( code, chars );
				return;
			}

			// addition and multiplication
			if ( commutative[ this.right.operator ] && this.right.right.type === 'Identifier' && ( this.right.right.name === this.left.name ) ) {
				code.appendLeft( this.left.end, this.right.operator );
				code.remove( this.right.left.end, this.right.end );

				this.right.left.minify( code, chars );
				return;
			}
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return AssignmentExpression;
}(Node));

function isNegativeZero ( num ) {
	return num === 0 && ( 1 / num < 0 );
}

// TODO if string, determine which quotes to use
// TODO if number, determine whether to use e notation

function stringify ( value ) {
	if ( typeof value === 'function' ) { return null; }

	if ( value !== value ) { return 'NaN'; }
	if ( value === Infinity ) { return '1/0'; }
	if ( value === -Infinity ) { return '-1/0'; }
	if ( value === true ) { return '!0'; }
	if ( value === false ) { return '!1'; }
	if ( value === undefined ) { return 'void 0'; }
	if ( isNegativeZero( value ) ) { return '-0'; }

	if ( typeof value === 'number' ) {
		var str = String( value ).replace( /^(-)?0\./, '$1.' );
		var exponential = value.toExponential().replace( 'e+', 'e' );

		return exponential.length < str.length ? exponential : str;
	}

	return JSON.stringify( value )
		.replace( /\u2028/g, '\\u2028' )
		.replace( /\u2029/g, '\\u2029' );
}

function getValuePrecedence ( value ) {
	if ( value === true || value === false || value === undefined ) { return 16; } // unary operator — !0, !1, void 0
	if ( typeof value === 'number' ) {
		if ( value === Infinity || value === -Infinity ) { return 14; } // division — 1/0, -1/0
		if ( value < 0 || isNegativeZero( value ) ) { return 16; }
	}

	return 21;
}

var calculators = {
	'**' : function ( a, b ) { return Math.pow( a, b ); },
	'*'  : function ( a, b ) { return a * b; },
	'/'  : function ( a, b ) { return a / b; },
	'%'  : function ( a, b ) { return a % b; },
	'+'  : function ( a, b ) { return a + b; },
	'-'  : function ( a, b ) { return a - b; },
	'<<' : function ( a, b ) { return a << b; },
	'>>' : function ( a, b ) { return a >> b; },
	'>>>': function ( a, b ) { return a >>> b; },
	'<'  : function ( a, b ) { return a < b; },
	'<=' : function ( a, b ) { return a <= b; },
	'>'  : function ( a, b ) { return a > b; },
	'>=' : function ( a, b ) { return a >= b; },
	'==' : function ( a, b ) { return a == b; },
	'!=' : function ( a, b ) { return a != b; },
	'===': function ( a, b ) { return a === b; },
	'!==': function ( a, b ) { return a !== b; },
	'&'  : function ( a, b ) { return a & b; },
	'^'  : function ( a, b ) { return a ^ b; },
	'|'  : function ( a, b ) { return a | b; },
	in   : function ( a, b ) { return a in b; },
	instanceof: function ( a, b ) { return a instanceof b; }
};

var binaryExpressionPrecedence = {};
[
	[  7, '|' ],
	[  8, '^' ],
	[  9, '&' ],
	[ 10, '!== === != ==' ],
	[ 11, 'instanceof in >= > <= <' ],
	[ 12, '>>> >> <<' ],
	[ 13, '- +' ],
	[ 14, '% / *' ],
	[ 15, '**' ]
].forEach( function (ref) {
	var precedence = ref[0];
	var operators = ref[1];

	operators.split( ' ' ).forEach( function (operator) { return binaryExpressionPrecedence[ operator ] = precedence; } );
});

var BinaryExpression = (function (Node$$1) {
	function BinaryExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) BinaryExpression.__proto__ = Node$$1;
	BinaryExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	BinaryExpression.prototype.constructor = BinaryExpression;

	BinaryExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		return this.left.getLeftHandSide();
	};

	BinaryExpression.prototype.getPrecedence = function getPrecedence () {
		var value = this.getValue();

		return value === UNKNOWN ?
			binaryExpressionPrecedence[ this.operator ] :
			getValuePrecedence( value );
	};

	// TODO `program.addWord( stringify( this.getValue() ) )`...
	BinaryExpression.prototype.getValue = function getValue () {
		var left = this.left.getValue();
		var right = this.right.getValue();

		if ( left === UNKNOWN || right === UNKNOWN ) { return UNKNOWN; }

		return calculators[ this.operator ]( left, right );
	};

	BinaryExpression.prototype.minify = function minify ( code, chars ) {
		var value = this.getValue();

		if ( value !== UNKNOWN ) {
			code.overwrite( this.start, this.end, stringify( value ) );
		}

		else {
			var operator = this.operator;

			if ( code.original[ this.right.getLeftHandSide().start ] === operator ) {
				// prevent e.g. `1 - --t` becoming 1---t
				operator = operator + " ";
			} else if ( /\w/.test( this.operator ) ) {
				// `foo in bar`, not `fooinbar`
				operator = " " + operator + " ";
			}

			code.overwrite( this.left.end, this.right.start, operator );

			Node$$1.prototype.minify.call( this, code, chars );
		}
	};

	return BinaryExpression;
}(Node));

var safeFunctions = [
	// TODO this list is possibly a bit arbitrary. Also *technically*
	// unsafe, though I'm inclined to wait for examples of it causing
	// breakage in the wild
	Array.prototype.concat,
	Array.prototype.indexOf,
	Array.prototype.join,
	Array.prototype.lastIndexOf,
	Array.prototype.reverse,
	Array.prototype.slice,
	Array.prototype.sort,
	Array.prototype.toString,

	String.fromCharCode,
	String.fromCodePoint,

	String.prototype.charAt,
	String.prototype.charCodeAt,
	String.prototype.codePointAt,
	String.prototype.concat, // WARNING! https://github.com/jquery/jquery/pull/473
	String.prototype.endsWith,
	String.prototype.includes,
	String.prototype.indexOf,
	String.prototype.lastIndexOf,
	String.prototype.slice,
	String.prototype.startsWith,
	String.prototype.substr,
	String.prototype.substring,
	String.prototype.toLowerCase,
	String.prototype.toString,
	String.prototype.toUpperCase,
	String.prototype.trim,
	String.prototype.trimLeft,
	String.prototype.trimRight,
	String.prototype.valueOf

	// TODO others...
];

var CallExpression = (function (Node$$1) {
	function CallExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) CallExpression.__proto__ = Node$$1;
	CallExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	CallExpression.prototype.constructor = CallExpression;

	CallExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		return this.callee.getLeftHandSide();
	};

	CallExpression.prototype.getPrecedence = function getPrecedence () {
		var value = this.getValue();
		if ( value === UNKNOWN ) {
			// function expressions are a special (annoying) case
			var node = this.callee;
			while ( node.type === 'ParenthesizedExpression' ) { node = node.expression; }
			if ( /FunctionExpression/.test( node.getLeftHandSide().type ) ) {
				if ( this.parent.type !== 'ExpressionStatement' ) { return 0; }
			}

			return 18;
		} else {
			return getValuePrecedence( value );
		}
	};

	CallExpression.prototype.getValue = function getValue () {
		var this$1 = this;

		if ( this.callee.type !== 'MemberExpression' || this.callee.property.computed ) { return UNKNOWN; }

		var contextValue = this.callee.object.getValue();
		if ( contextValue === UNKNOWN ) { return UNKNOWN; }

		var calleeValue = contextValue[ this.callee.property.name ];

		if ( typeof calleeValue !== 'function' ) { return UNKNOWN; }
		if ( !~safeFunctions.indexOf( calleeValue ) ) { return UNKNOWN; }

		var argumentValues = new Array( this.arguments.length );
		for ( var i = 0; i < this.arguments.length; i += 1 ) {
			var argument = this$1.arguments[i];

			if ( argument ) {
				var value = argument.getValue();
				if ( value === UNKNOWN ) { return UNKNOWN; }

				argumentValues[i] = value;
			}
		}

		return calleeValue.apply( contextValue, argumentValues );
	};

	CallExpression.prototype.initialise = function initialise ( program, scope ) {
		if ( this.callee.type === 'Identifier' && this.callee.name === 'eval' && !scope.contains( 'eval' ) ) {
			if ( this.program.options.allowDangerousEval ) {
				scope.deopt();
			} else {
				this.error( 'Use of direct eval prevents effective minification and can introduce security vulnerabilities. Use `allowDangerousEval: true` if you know what you\'re doing' );
			}
		}
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	CallExpression.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		var value = this.getValue();

		if ( value !== UNKNOWN ) {
			var str = stringify( value );

			if ( str !== null ) {
				code.overwrite( this.start, this.end, str );
				return;
			}
		}

		if ( this.arguments.length ) {
			var lastNode = this.callee;

			for ( var i = 0; i < this.arguments.length; i += 1 ) {
				var argument = this$1.arguments[i];

				if ( argument.start > lastNode.end + 1 ) { code.overwrite( lastNode.end, argument.start, i ? ',' : '(' ); }
				lastNode = argument;
			}

			if ( this.end > lastNode.end + 1 ) { code.overwrite( lastNode.end, this.end, ')' ); }
		}

		else if ( this.end > this.callee.end + 2 ) {
			code.overwrite( this.callee.end, this.end, '()' );
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return CallExpression;
}(Node));

var CatchClause = (function (Node$$1) {
	function CatchClause () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) CatchClause.__proto__ = Node$$1;
	CatchClause.prototype = Object.create( Node$$1 && Node$$1.prototype );
	CatchClause.prototype.constructor = CatchClause;

	CatchClause.prototype.attachScope = function attachScope ( program, parent ) {
		var this$1 = this;

		this.scope = new Scope({
			block: true,
			parent: parent
		});

		extractNames( this.param ).forEach( function (node) {
			this$1.scope.addDeclaration( node, 'param' );
		});

		for ( var i = 0; i < this.body.body.length; i += 1 ) {
			this$1.body.body[i].attachScope( program, this$1.scope );
		}

		if ( this.finalizer ) {
			this.finalizer.attachScope( program, this.scope );
		}
	};

	CatchClause.prototype.initialise = function initialise ( program ) {
		program.addWord( 'catch' );
		Node$$1.prototype.initialise.call( this, program, this.scope );
	};

	CatchClause.prototype.minify = function minify ( code, chars ) {
		this.scope.mangle( code, chars );

		if ( this.param.start > this.start + 6 ) {
			code.overwrite( this.start + 5, this.param.start, '(' );
		}

		if ( this.body.start > this.param.end + 1 ) {
			code.overwrite( this.param.end, this.body.start, ')' );
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return CatchClause;
}(Node));

var ClassBody = (function (Node$$1) {
	function ClassBody () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ClassBody.__proto__ = Node$$1;
	ClassBody.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ClassBody.prototype.constructor = ClassBody;

	ClassBody.prototype.attachScope = function attachScope ( program, parent ) {
		var this$1 = this;

		for ( var i = 0; i < this.body.length; i += 1 ) {
			this$1.body[i].attachScope( program, parent );
		}
	};

	ClassBody.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		var c = this.start + 1;

		for ( var i = 0; i < this.body.length; i += 1 ) {
			var method = this$1.body[i];
			if ( method.start > c ) { code.remove( c, method.start ); }

			method.minify( code, chars );

			c = method.end;
		}

		if ( this.end > c + 1 ) { code.remove( c, this.end - 1 ); }
	};

	return ClassBody;
}(Node));

function shouldParenthesizeSuperclass ( node ) {
	while ( node.type === 'ParenthesizedExpression' ) { node = node.expression; }

	var value = node.getValue();
	if ( value === UNKNOWN ) { return node.getPrecedence() < 18; }

	return ( value === true || value === false || value === undefined || isNegativeZero( value ) );
}

var Class = (function (Node$$1) {
	function Class () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) Class.__proto__ = Node$$1;
	Class.prototype = Object.create( Node$$1 && Node$$1.prototype );
	Class.prototype.constructor = Class;

	Class.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'class' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	Class.prototype.minify = function minify ( code, chars ) {
		var c = this.start + 5;

		if ( this.id ) {
			if ( this.id.start > c + 1 ) { code.remove( c + 1, this.id.start ); }
			c = this.id.end;
		}

		if ( this.superClass ) {
			// edge case
			if ( shouldParenthesizeSuperclass( this.superClass ) ) {
				code.overwrite( c, this.superClass.start, ' extends(' );
				code.prependRight( this.body.start, ')' );
			}

			else if ( this.superClass.start > c + 8 ) {
				code.overwrite( c, this.superClass.start, ' extends ' );
			}

			c = this.superClass.end;
		}

		if ( this.body.start > c ) { code.remove( c, this.body.start ); }

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return Class;
}(Node));

var ClassDeclaration = (function (Class$$1) {
	function ClassDeclaration () {
		Class$$1.apply(this, arguments);
	}

	if ( Class$$1 ) ClassDeclaration.__proto__ = Class$$1;
	ClassDeclaration.prototype = Object.create( Class$$1 && Class$$1.prototype );
	ClassDeclaration.prototype.constructor = ClassDeclaration;

	ClassDeclaration.prototype.activate = function activate () {
		if ( this.activated ) { return; }
		this.activated = true;

		this.skip = false;
		Class$$1.prototype.initialise.call( this, this.program, this.scope );
	};

	ClassDeclaration.prototype.attachScope = function attachScope ( program, scope ) {
		this.program = program;
		this.scope = scope;

		this.id.declaration = this;

		this.name = this.id.name; // TODO what is this used for?
		scope.addDeclaration( this.id, 'class' );

		this.id.attachScope( program, this.scope );
		if ( this.superClass ) { this.superClass.attachScope( program, this.scope ); }
		this.body.attachScope( program, scope );
	};

	ClassDeclaration.prototype.initialise = function initialise ( program, scope ) {
		if ( scope.parent ) {
			// noop — we wait for this declaration to be activated
		} else {
			Class$$1.prototype.initialise.call( this, program, scope );
		}
	};

	return ClassDeclaration;
}(Class));

var ClassExpression = (function (Class$$1) {
	function ClassExpression () {
		Class$$1.apply(this, arguments);
	}

	if ( Class$$1 ) ClassExpression.__proto__ = Class$$1;
	ClassExpression.prototype = Object.create( Class$$1 && Class$$1.prototype );
	ClassExpression.prototype.constructor = ClassExpression;

	ClassExpression.prototype.attachScope = function attachScope ( program, parent ) {
		this.scope = new Scope({
			block: true,
			parent: parent
		});

		if ( this.id ) { this.id.attachScope( program, this.scope ); }
		if ( this.superClass ) { this.superClass.attachScope( program, this.scope ); }
		this.body.attachScope( program, this.scope );
	};

	ClassExpression.prototype.initialise = function initialise ( program, scope ) {
		if ( this.id ) {
			this.id.declaration = this;

			// function expression IDs belong to the child scope...
			this.scope.addDeclaration( this.id, 'class' );
			this.scope.addReference( this.id );
		}

		Class$$1.prototype.initialise.call( this, program, scope );
	};

	ClassExpression.prototype.minify = function minify ( code, chars ) {
		this.scope.mangle( code, chars );
		Class$$1.prototype.minify.call( this, code, chars );
	};

	return ClassExpression;
}(Class));

var ConditionalExpression = (function (Node$$1) {
	function ConditionalExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ConditionalExpression.__proto__ = Node$$1;
	ConditionalExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ConditionalExpression.prototype.constructor = ConditionalExpression;

	ConditionalExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		var testValue = this.test.getValue();
		var node = testValue === UNKNOWN ? this.test : ( testValue ? this.consequent : this.alternate );

		return node.getLeftHandSide();
	};

	ConditionalExpression.prototype.getPrecedence = function getPrecedence () {
		var testValue = this.test.getValue();
		return testValue === UNKNOWN ? 4 : ( testValue ? this.consequent : this.alternate ).getPrecedence();
	};

	ConditionalExpression.prototype.getRightHandSide = function getRightHandSide () {
		var testValue = this.test.getValue();
		var node = testValue === UNKNOWN ? this.alternate : ( testValue ? this.alternate : this.consequent );

		return node.getRightHandSide();
	};

	ConditionalExpression.prototype.getValue = function getValue () {
		var testValue = this.test.getValue();
		var consequentValue = this.consequent.getValue();
		var alternateValue = this.alternate.getValue();

		if ( testValue === UNKNOWN || consequentValue === UNKNOWN || alternateValue === UNKNOWN ) { return UNKNOWN; }

		return testValue ? consequentValue : alternateValue;
	};

	ConditionalExpression.prototype.initialise = function initialise ( program, scope ) {
		var testValue = this.test.getValue();

		if ( testValue === UNKNOWN ) {
			Node$$1.prototype.initialise.call( this, program, scope );
		} else if ( testValue ) {
			this.consequent.initialise( program, scope );
		} else {
			this.alternate.initialise( program, scope );
		}
	};

	ConditionalExpression.prototype.minify = function minify ( code, chars ) {
		var testValue = this.test.getValue();

		// TODO rewrite `!a ? b() : c()` as `a ? c() : b()`

		if ( testValue === UNKNOWN ) {
			// remove whitespace
			if ( this.consequent.start > this.test.end + 1 ) {
				code.overwrite( this.test.end, this.consequent.start, '?' );
			}

			if ( this.alternate.start > this.consequent.end + 1 ) {
				code.overwrite( this.consequent.end, this.alternate.start, ':' );
			}

			Node$$1.prototype.minify.call( this, code, chars );
		} else if ( testValue ) {
			// remove test and alternate
			code.remove( this.start, this.consequent.start );
			code.remove( this.consequent.end, this.end );

			this.consequent.minify( code, chars );
		} else {
			// remove test and consequent
			code.remove( this.start, this.alternate.start );

			this.alternate.minify( code, chars );
		}
	};

	return ConditionalExpression;
}(Node));

var DoWhileStatement = (function (Node$$1) {
	function DoWhileStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) DoWhileStatement.__proto__ = Node$$1;
	DoWhileStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	DoWhileStatement.prototype.constructor = DoWhileStatement;

	DoWhileStatement.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'dowhile' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	DoWhileStatement.prototype.minify = function minify ( code, chars ) {
		// special case
		if ( this.body.isEmpty() ) {
			code.overwrite( this.start + 2, this.test.start, ';while(' );
		}

		else {
			this.body.minify( code, chars );

			if ( this.body.type === 'BlockStatement' ) {
				code.remove( this.start + 2, this.body.start );
				code.overwrite( this.body.end, this.test.start, 'while(' );
			} else {
				if ( this.body.start > this.start + 2 ) { code.remove( this.start + 2, this.body.start ); }
				this.body.prepend( code, '{' );

				var c = this.body.end;
				while ( code.original[ c - 1 ] === ';' ) { c -= 1; }
				code.overwrite( c, this.test.start, '}while(' );
			}
		}

		if ( this.end > this.test.end + 1 ) {
			var c$1 = this.end;
			while ( code.original[ c$1 - 1 ] === ';' ) { c$1 -= 1; }
			code.overwrite( this.test.end, c$1, ')' );
		}

		this.test.minify( code, chars );
	};

	return DoWhileStatement;
}(Node));

var EmptyStatement = (function (Node$$1) {
	function EmptyStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) EmptyStatement.__proto__ = Node$$1;
	EmptyStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	EmptyStatement.prototype.constructor = EmptyStatement;

	EmptyStatement.prototype.initialise = function initialise () {
		// noop. this prevents Node#initialise from
		// 'de-skipping' this node
	};

	return EmptyStatement;
}(Node));

var ExpressionStatement = (function (Node$$1) {
	function ExpressionStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ExpressionStatement.__proto__ = Node$$1;
	ExpressionStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ExpressionStatement.prototype.constructor = ExpressionStatement;

	ExpressionStatement.prototype.canSequentialise = function canSequentialise () {
		return true;
	};

	ExpressionStatement.prototype.getLeftHandSide = function getLeftHandSide () {
		return this.expression.getLeftHandSide();
	};

	ExpressionStatement.prototype.getPrecedence = function getPrecedence () {
		return this.expression.getPrecedence();
	};

	ExpressionStatement.prototype.getRightHandSide = function getRightHandSide () {
		return this.expression.getRightHandSide();
	};

	ExpressionStatement.prototype.initialise = function initialise ( program, scope ) {
		if ( this.expression.type === 'Literal' || this.expression.getValue() !== UNKNOWN ) {
			// remove side-effect-free statements (TODO others, not just literals)...
			return;
		}

		Node$$1.prototype.initialise.call( this, program, scope );
	};

	return ExpressionStatement;
}(Node));

var LoopStatement = (function (Node$$1) {
	function LoopStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) LoopStatement.__proto__ = Node$$1;
	LoopStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	LoopStatement.prototype.constructor = LoopStatement;

	LoopStatement.prototype.attachScope = function attachScope ( program, parent ) {
		if ( this.hasVariableDeclaration() ) {
			this.scope = new Scope({
				block: true,
				parent: parent
			});

			Node$$1.prototype.attachScope.call( this, program, this.scope );
		} else {
			Node$$1.prototype.attachScope.call( this, program, parent );
		}
	};

	LoopStatement.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'for' );
		if ( this.type === 'ForInStatement' ) { program.addWord( 'in' ); }
		else if ( this.type === 'ForOfStatement' ) { program.addWord( 'of' ); }

		Node$$1.prototype.initialise.call( this, program, this.scope || scope );
	};

	LoopStatement.prototype.minify = function minify ( code, chars ) {
		if ( this.scope ) { this.scope.mangle( code, chars ); }

		// special case — empty body
		if ( this.body.isEmpty() ) {
			code.appendLeft( this.body.start, ';' );
			code.remove( this.body.start, this.body.end );
		} else {
			this.body.minify( code, chars );
		}
	};

	return LoopStatement;
}(Node));

var ForStatement = (function (LoopStatement$$1) {
	function ForStatement () {
		LoopStatement$$1.apply(this, arguments);
	}

	if ( LoopStatement$$1 ) ForStatement.__proto__ = LoopStatement$$1;
	ForStatement.prototype = Object.create( LoopStatement$$1 && LoopStatement$$1.prototype );
	ForStatement.prototype.constructor = ForStatement;

	ForStatement.prototype.getRightHandSide = function getRightHandSide () {
		return this.body.getRightHandSide();
	};

	ForStatement.prototype.hasVariableDeclaration = function hasVariableDeclaration () {
		return this.init && this.init.type === 'VariableDeclaration';
	};

	ForStatement.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		var c = this.start + 3;

		var replacement = '(';

		[ this.init, this.test, this.update ].forEach( function ( statement, i ) {
			if ( statement && ( !statement.skip || statement === this$1.test  ) ) {
				if ( statement.start > c + replacement.length ) {
					code.overwrite( c, statement.start, replacement );
				}

				statement.minify( code, chars );

				c = statement.end;
				replacement = '';
			}

			replacement += i === 2 ? ')' : ';';
		});

		if ( this.body.start > c + replacement.length ) {
			code.overwrite( c, this.body.start, replacement );
		}

		LoopStatement$$1.prototype.minify.call( this, code, chars );
	};

	return ForStatement;
}(LoopStatement));

var ForInOfStatement = (function (LoopStatement$$1) {
	function ForInOfStatement () {
		LoopStatement$$1.apply(this, arguments);
	}

	if ( LoopStatement$$1 ) ForInOfStatement.__proto__ = LoopStatement$$1;
	ForInOfStatement.prototype = Object.create( LoopStatement$$1 && LoopStatement$$1.prototype );
	ForInOfStatement.prototype.constructor = ForInOfStatement;

	ForInOfStatement.prototype.getRightHandSide = function getRightHandSide () {
		return this.body.getRightHandSide();
	};

	ForInOfStatement.prototype.hasVariableDeclaration = function hasVariableDeclaration () {
		return this.left.type === 'VariableDeclaration';
	};

	ForInOfStatement.prototype.minify = function minify ( code, chars ) {
		if ( this.left.start > this.start + 4 ) {
			code.overwrite( this.start + 3, this.left.start, '(' );
		}

		if ( this.right.start > this.left.end + 4 ) {
			code.overwrite( this.left.end, this.right.start, ' in ' );
		}

		if ( this.body.start > this.right.end + 1 ) {
			code.overwrite( this.right.end, this.body.start, ')' );
		}

		this.left.minify( code, chars );
		this.right.minify( code, chars );
		LoopStatement$$1.prototype.minify.call( this, code, chars );
	};

	return ForInOfStatement;
}(LoopStatement));

function hasFunctionKeyword ( node, parent ) {
	if ( node === parent.value ) {
		if ( parent.type === 'MethodDefinition' ) { return false; }

		if ( parent.type === 'Property' ) {
			if ( parent.method ) { return false; }
			if ( parent.kind === 'set' || parent.kind === 'get' ) { return false; }
		}
	}

	return true;
}

function keepId ( node ) {
	if ( !node.id ) { return false; }
	if ( node.type === 'FunctionDeclaration' ) { return true; }

	// if function expression ID is shadowed, or is not referenced (other than
	// by the function expression itself), remove it
	return !node.shadowed && node.scope.declarations[ node.id.name ].instances.length > 1;
}

var FunctionNode = (function (Node$$1) {
	function FunctionNode () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) FunctionNode.__proto__ = Node$$1;
	FunctionNode.prototype = Object.create( Node$$1 && Node$$1.prototype );
	FunctionNode.prototype.constructor = FunctionNode;

	FunctionNode.prototype.attachScope = function attachScope ( program, parent ) {
		var this$1 = this;

		this.program = program;
		this.scope = new Scope({
			block: false,
			parent: parent
		});

		if ( this.id ) {
			this.id.declaration = this;

			// function expression IDs belong to the child scope...
			if ( this.type === 'FunctionExpression' ) {
				this.scope.addDeclaration( this.id, this.type );
				this.scope.addReference( this.id );
			} else {
				parent.addDeclaration( this.id, this.type );
			}
		}

		this.params.forEach( function (param) {
			param.attachScope( program, this$1.scope );

			extractNames( param ).forEach( function (node) {
				node.declaration = this$1;
				this$1.scope.addDeclaration( node, 'param' );
			});
		});

		this.body.attachScope( program, this.scope );
	};

	FunctionNode.prototype.findVarDeclarations = function findVarDeclarations () {
		// noop
	};

	// TODO `program.addWord('async')` if necessary

	FunctionNode.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		var c = this.start;

		if ( hasFunctionKeyword( this, this.parent ) ) {
			// TODO this could probably be simpler
			var shouldKeepId = keepId( this );
			if ( shouldKeepId ) {
				c = this.id.start;

				if ( this.async ) {
					if ( c > this.start + 15 ) { code.overwrite( this.start + 6, c, this.generator ? 'function*' : 'function ' ); }
				} else {
					if ( c > this.start + 9 ) { code.overwrite( this.start + 8, c, this.generator ? '*' : ' ' ); }
				}

				c = this.id.end;
			} else {
				while ( code.original[c] !== '(' ) { c += 1; }

				if ( this.async ) {
					var replacement = this.generator ? 'function*' : 'function';
					if ( c > this.start + 6 + replacement.length ) { code.overwrite( this.start + 6, c, replacement ); }
				} else {
					var replacement$1 = this.generator ? '*' : '';
					if ( c > this.start + 8 + replacement$1.length ) { code.overwrite( this.start + 8, c, replacement$1 ); }
				}
			}
		}

		if ( this.params.length ) {
			for ( var i = 0; i < this.params.length; i += 1 ) {
				var param = this$1.params[i];
				param.minify( code, chars );

				if ( param.start > c + 1 ) { code.overwrite( c, param.start, i ? ',' : '(' ); }
				c = param.end;
			}

			if ( this.end > c + 1 ) { code.overwrite( c, this.body.start, ')' ); }
		} else if ( this.body.start > c + 2 ) {
			code.overwrite( c, this.body.start, "()" );
		}

		this.body.minify( code, chars );
	};

	return FunctionNode;
}(Node));

var FunctionDeclaration = (function (FunctionNode$$1) {
	function FunctionDeclaration () {
		FunctionNode$$1.apply(this, arguments);
	}

	if ( FunctionNode$$1 ) FunctionDeclaration.__proto__ = FunctionNode$$1;
	FunctionDeclaration.prototype = Object.create( FunctionNode$$1 && FunctionNode$$1.prototype );
	FunctionDeclaration.prototype.constructor = FunctionDeclaration;

	FunctionDeclaration.prototype.activate = function activate () {
		var this$1 = this;

		if ( this.activated ) { return; }
		this.activated = true;

		this.skip = false;

		this.program.addWord( 'function' );
		if ( this.id ) { this.id.initialise( this.program, this.scope.parent ); }
		this.params.forEach( function (param) {
			param.initialise( this$1.program, this$1.scope );
		});
		this.body.initialise( this.program, this.scope );
	};

	FunctionDeclaration.prototype.initialise = function initialise ( program, scope ) {
		if ( scope.parent ) {
			// noop — we wait for this declaration to be activated
		} else {
			this.activate( program );
		}
	};

	return FunctionDeclaration;
}(FunctionNode));

var FunctionExpression = (function (FunctionNode$$1) {
	function FunctionExpression () {
		FunctionNode$$1.apply(this, arguments);
	}

	if ( FunctionNode$$1 ) FunctionExpression.__proto__ = FunctionNode$$1;
	FunctionExpression.prototype = Object.create( FunctionNode$$1 && FunctionNode$$1.prototype );
	FunctionExpression.prototype.constructor = FunctionExpression;

	FunctionExpression.prototype.getPrecedence = function getPrecedence () {
		return 0;
	};

	FunctionExpression.prototype.initialise = function initialise ( program ) {
		program.addWord( 'function' ); // TODO only if has function keyword
		FunctionNode$$1.prototype.initialise.call( this, program, this.scope );
	};

	return FunctionExpression;
}(FunctionNode));

var Identifier = (function (Node$$1) {
	function Identifier () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) Identifier.__proto__ = Node$$1;
	Identifier.prototype = Object.create( Node$$1 && Node$$1.prototype );
	Identifier.prototype.constructor = Identifier;

	Identifier.prototype.activate = function activate () {
		if ( this.declaration && this.declaration.activate ) {
			this.declaration.activate();
		}

		// TODO in what circumstances would an identifier be 'activated' if it
		// didn't have a declaration... parameters?
	};

	Identifier.prototype.attachScope = function attachScope ( program, scope ) {
		this.scope = scope;
	};

	Identifier.prototype.getPrecedence = function getPrecedence () {
		return 21;
	};

	Identifier.prototype.getValue = function getValue () {
		if ( this.name === 'undefined' ) {
			if ( !this.scope.contains( 'undefined' ) ) { return undefined; }
		}

		if ( this.name === 'Infinity' ) {
			if ( !this.scope.contains( 'Infinity' ) ) { return Infinity; }
		}

		return UNKNOWN;
	};

	Identifier.prototype.initialise = function initialise ( program, scope ) {
		// special case
		if ( ( this.parent.type === 'FunctionExpression' || this.parent.type === 'ClassExpression' ) && this === this.parent.id ) {
			return;
		}

		// TODO add global/top-level identifiers to frequency count

		if ( this.isReference() ) {
			scope.addReference( this );
		}
	};

	Identifier.prototype.isReference = function isReference () {
		var parent = this.parent;

		if ( parent.type === 'MemberExpression' || parent.type === 'MethodDefinition' ) {
			return parent.computed || this === parent.object;
		}

		// disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
		if ( parent.type === 'Property' ) { return parent.computed || this === parent.value; }

		// disregard the `bar` in `class Foo { bar () {...} }`
		if ( parent.type === 'MethodDefinition' ) { return false; }

		// disregard the `bar` in `export { foo as bar }`
		if ( parent.type === 'ExportSpecifier' && this !== parent.local ) { return false; }

		return true;
	};

	Identifier.prototype.minify = function minify ( code ) {
		var value = this.getValue();
		if ( value !== UNKNOWN && this.isReference() ) {
			code.overwrite( this.start, this.end, stringify( value ) );
		}

		// TODO should aliasing happen here, rather than in Scope?
		// if ( this.alias ) {
		// 	const replacement = this.parent.type === 'Property' && this.parent.shorthand ?
		// 		`${this.name}:${this.alias}` :
		// 		this.alias;

		// 	code.overwrite( this.start, this.end, replacement, true );
		// }
	};

	return Identifier;
}(Node));

var invalidChars = /[a-zA-Z$_0-9/]/;

// TODO this whole thing is kinda messy... refactor it

function endsWithCurlyBraceOrSemicolon ( node ) {
	return (
		node.type === 'BlockStatement' ||
		node.type === 'SwitchStatement' ||
		node.type === 'TryStatement' ||
		node.type === 'EmptyStatement'
	);
}

var IfStatement = (function (Node$$1) {
	function IfStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) IfStatement.__proto__ = Node$$1;
	IfStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	IfStatement.prototype.constructor = IfStatement;

	IfStatement.prototype.canSequentialise = function canSequentialise () {
		var testValue = this.test.getValue();

		if ( testValue === UNKNOWN ) {
			return this.consequent.canSequentialise() && ( !this.alternate || this.alternate.canSequentialise() );
		}

		if ( testValue ) {
			return this.consequent.canSequentialise();
		}

		return this.alternate ? this.alternate.canSequentialise() : false;
	};

	IfStatement.prototype.getLeftHandSide = function getLeftHandSide () {
		var testValue = this.test.getValue();

		if ( testValue === UNKNOWN ) {
			if ( this.canSequentialise() ) { return ( this.inverted ? this.test.argument : this.test ).getLeftHandSide(); }
			return this;
		}

		if ( testValue ) { return this.consequent.getLeftHandSide(); }
		return this.alternate.getLeftHandSide();
	};

	IfStatement.prototype.getRightHandSide = function getRightHandSide () {
		var testValue = this.test.getValue();

		if ( testValue === UNKNOWN ) {
			if ( this.canSequentialise() ) { return ( this.alternate ? ( this.inverted ? this.consequent : this.alternate ) : this.consequent ).getRightHandSide(); }
			return ( this.alternate || this.consequent ).getRightHandSide();
		}

		if ( testValue || !this.alternate ) { return this.consequent.getRightHandSide(); }
		return this.alternate.getRightHandSide();
	};

	IfStatement.prototype.initialise = function initialise ( program, scope ) {
		// TODO add 'if/else' to character frequency, but only if not rewriting as sequence

		this.skip = false; // TODO skip if known to be safe

		var testValue = this.test.getValue();

		if ( testValue === UNKNOWN ) {
			// initialise everything
			this.test.initialise( program, scope );
			this.consequent.initialise( program, scope );
			if ( this.alternate ) { this.alternate.initialise( program, scope ); }
		}

		else if ( testValue ) { // if ( true ) {...}
			this.consequent.initialise( program, scope );

			if ( this.alternate && this.alternate.type === 'BlockStatement' ) {
				this.alternate.scope.varDeclarations.forEach( function (name) {
					scope.functionScope.hoistedVars.add( name );
				});
			}
		}

		else { // if ( false ) {...}
			if ( this.alternate ) {
				this.alternate.initialise( program, scope );
			} else {
				this.skip = true;
			}

			if ( this.consequent.type === 'BlockStatement' ) {
				this.consequent.scope.varDeclarations.forEach( function (name) {
					scope.functionScope.hoistedVars.add( name );
				});
			}
		}

		this.inverted = this.test.type === 'UnaryExpression' && this.test.operator === '!';
	};

	IfStatement.prototype.minify = function minify ( code, chars ) {
		var testValue = this.test.getValue();

		if ( testValue !== UNKNOWN ) {
			if ( testValue ) { // if ( true ) {...}
				if ( this.alternate ) {
					// TODO handle var declarations in alternate
					code.remove( this.consequent.end, this.end );
				}

				code.remove( this.start, this.consequent.start );
				this.consequent.minify( code, chars );
			} else { // if ( false ) {...}
				// we know there's an alternate, otherwise we wouldn't be here
				this.alternate.minify( code, chars );
				code.remove( this.start, this.alternate.start );
			}

			return;
		}

		this.test.minify( code, chars );

		// if we're rewriting as &&, test must be higher precedence than 6
		// to avoid being wrapped in parens. If ternary, 4
		var targetPrecedence = this.alternate ? 4 : this.inverted ? 5 : 6;
		var test = this.inverted ? this.test.argument : this.test;

		var shouldParenthesiseTest = (
			test.getPrecedence() < targetPrecedence ||
			test.getLeftHandSide().type === 'ObjectExpression' ||
			test.getRightHandSide().type === 'ObjectExpression'
		);

		// TODO what if nodes in the consequent are skipped...
		var shouldParenthesiseConsequent = this.consequent.type === 'BlockStatement' ?
			( this.consequent.body.length === 1 ? this.consequent.body[0].getPrecedence() < targetPrecedence : true ) :
			this.consequent.getPrecedence() < targetPrecedence;

		// special case – empty consequent
		if ( this.consequent.isEmpty() ) {
			var canRemoveTest = this.test.type === 'Identifier' || this.test.getValue() !== UNKNOWN; // TODO can this ever happen?

			if ( this.alternate && !this.alternate.isEmpty() ) {
				this.alternate.minify( code, chars );

				if ( this.alternate.type === 'BlockStatement' && this.alternate.body.length === 0 ) {
					if ( canRemoveTest ) {
						code.remove( this.start, this.end );
						this.removed = true;
					} else {
						code.remove( this.start, this.test.start );
						code.remove( this.test.end, this.end );
					}
				} else if ( this.alternate.canSequentialise() ) {
					var alternatePrecedence;
					if ( this.alternate.type === 'IfStatement' ) {
						alternatePrecedence = this.alternate.alternate ?
							4 : // will rewrite as ternary
							5;
					} else if ( this.alternate.type === 'BlockStatement' ) {
						alternatePrecedence = this.alternate.body.length === 1 ?
							this.alternate.body[0].getPrecedence() :
							0; // sequence
					} else {
						alternatePrecedence = 0; // err on side of caution
					}

					var shouldParenthesiseAlternate = alternatePrecedence < ( this.inverted ? 6 : 5 );
					if ( shouldParenthesiseAlternate ) { this.alternate.parenthesize( code ); }

					code.remove( this.start, this.inverted ? this.test.argument.start : this.test.start );
					code.overwrite( this.test.end, this.alternate.start, this.inverted ? '&&' : '||' );
				} else {
					var before = '(';
					var after = ')';

					var start = this.test.start;

					if ( this.inverted ) {
						start = this.test.argument.start;
					} else {
						before += '!';

						if ( this.test.getPrecedence() < 16 ) { // 16 is the precedence of unary expressions
							before += '(';
							after += ')';
						}
					}

					code.overwrite( this.start + 2, start, before );
					code.overwrite( this.test.end, this.alternate.start, after );
				}
			} else {
				// TODO is `removed` still used?
				if ( canRemoveTest ) {
					code.remove( this.start, this.end );
					this.removed = true;
				} else {
					code.remove( this.start, this.test.start );
					code.remove( this.test.end, this.end );
				}
			}

			return;
		}

		// special case - empty alternate
		if ( this.alternate && this.alternate.isEmpty() ) {
			// don't minify alternate
			this.consequent.minify( code, chars );
			code.remove( this.consequent.end, this.end );

			if ( this.consequent.canSequentialise() ) {
				if ( shouldParenthesiseTest ) { this.test.parenthesize( code ); }
				if ( shouldParenthesiseConsequent ) { this.consequent.parenthesize( code ); }

				code.remove( this.start, ( this.inverted ? this.test.argument.start : this.test.start ) );
				code.remove( this.consequent.getRightHandSide().end, this.end );
				code.overwrite( this.test.end, this.consequent.start, this.inverted ? '||' : '&&' );
			}

			else {
				if ( this.test.start > this.start + 3 ) { code.overwrite( this.start, this.test.start, 'if(' ); }

				if ( this.consequent.start > this.test.end + 1 ) { code.overwrite( this.test.end, this.consequent.start, ')' ); }
				if ( this.end > this.consequent.end + 1 ) { code.remove( this.consequent.end, this.end - 1 ); }
			}

			return;
		}

		this.consequent.minify( code, chars );
		if ( this.alternate ) { this.alternate.minify( code, chars ); }

		if ( this.canSequentialise() ) {
			if ( this.inverted ) { code.remove( this.test.start, this.test.start + 1 ); }

			if ( this.alternate ) {
				this.rewriteAsTernaryExpression( code, shouldParenthesiseTest, shouldParenthesiseConsequent );
			} else {
				this.rewriteAsLogicalExpression( code, shouldParenthesiseTest, shouldParenthesiseConsequent );
			}
		}

		else {
			if ( this.test.start > this.start + 3 ) { code.overwrite( this.start + 2, this.test.start, '(' ); }
			if ( this.consequent.start > this.test.end + 1 ) { code.overwrite( this.test.end, this.consequent.start, ')' ); }

			if ( this.alternate ) {
				var lastNodeOfConsequent = this.consequent.getRightHandSide();
				var firstNodeOfAlternate = this.alternate.getLeftHandSide();

				var gap = ( endsWithCurlyBraceOrSemicolon( lastNodeOfConsequent ) ? '' : ';' ) + 'else';
				if ( invalidChars.test( code.original[ firstNodeOfAlternate.start ] ) ) { gap += ' '; }

				var c = this.consequent.end;
				while ( code.original[ c - 1 ] === ';' ) { c -= 1; }

				code.overwrite( c, this.alternate.start, gap );
			}
		}
	};

	IfStatement.prototype.preventsCollapsedReturns = function preventsCollapsedReturns ( returnStatements ) {
		var this$1 = this;

		// TODO make this a method of nodes
		if ( this.consequent.type === 'BlockStatement' ) {
			for ( var i = 0, list = this$1.consequent.body; i < list.length; i += 1 ) {
				var statement = list[i];

				if ( statement.skip ) { continue; }
				if ( statement.preventsCollapsedReturns( returnStatements ) ) { return true; }
			}
		} else {
			if ( this.consequent.preventsCollapsedReturns( returnStatements ) ) { return true; }
		}

		if ( this.alternate ) {
			if ( this.alternate.type === 'ExpressionStatement' ) { return false; }
			if ( this.alternate.type === 'ReturnStatement' ) { return returnStatements.push( this.alternate ), false; }
			if ( this.alternate.type === 'IfStatement' ) { return this.alternate.preventsCollapsedReturns( returnStatements ); }

			if ( this.alternate.type === 'BlockStatement' ) {
				for ( var i$1 = 0, list$1 = this$1.alternate.body; i$1 < list$1.length; i$1 += 1 ) {
					var statement$1 = list$1[i$1];

					if ( statement$1.skip ) { continue; }
					if ( statement$1.preventsCollapsedReturns( returnStatements ) ) { return true; }
				}
			}

			else {
				if ( this.alternate.preventsCollapsedReturns( returnStatements ) ) { return true; }
			}
		}
	};

	IfStatement.prototype.rewriteAsLogicalExpression = function rewriteAsLogicalExpression ( code, shouldParenthesiseTest, shouldParenthesiseConsequent ) {
		code.remove( this.start, this.test.start );

		if ( shouldParenthesiseTest ) { this.test.parenthesize( code ); }
		if ( shouldParenthesiseConsequent ) { this.consequent.parenthesize( code ); }

		code.overwrite( this.test.end, this.consequent.start, this.inverted ? '||' : '&&' );
	};

	IfStatement.prototype.rewriteAsTernaryExpression = function rewriteAsTernaryExpression ( code, shouldParenthesiseTest, shouldParenthesiseConsequent ) {
		this.rewriteAsSequence = true;

		var shouldParenthesiseAlternate = false;
		// TODO simplify this
		if ( this.alternate.type === 'IfStatement' ) {
			shouldParenthesiseAlternate = false;
		} else if ( this.alternate.type === 'BlockStatement' ) {
			shouldParenthesiseAlternate = this.alternate.body.length > 1 || this.alternate.body[0].getPrecedence() < 4;
		} else {
			shouldParenthesiseAlternate = this.alternate.getPrecedence() < 4;
		}

		// if ( this.alternate.type === 'BlockStatement' ) {
		// 	if ( this.alternate.body.length > 1 ) {
		// 		shouldParenthesiseAlternate = true;
		// 	} else if ( this.alternate.body[0].type !== 'IfStatement' ) {
		// 		shouldParenthesiseAlternate = this.alternate.body[0].getPrecedence() < 4;
		// 	}
		// }

		// const shouldParenthesiseAlternate = this.alternate.type === 'BlockStatement' ?
		// 	( this.alternate.body.length === 1 ? getPrecedence( this.alternate.body[0] ) < 4 : true ) :
		// 	false; // TODO <-- is this right? Ternaries are r-to-l, so... maybe?

		if ( shouldParenthesiseTest ) { this.test.parenthesize( code ); }
		if ( shouldParenthesiseConsequent ) { this.consequent.parenthesize( code ); }
		if ( shouldParenthesiseAlternate ) { this.alternate.parenthesize( code ); }

		code.remove( this.start, this.test.start );
		code.overwrite( this.test.end, this.consequent.start, '?' );

		var consequentEnd = this.consequent.end;
		while ( code.original[ consequentEnd - 1 ] === ';' ) { consequentEnd -= 1; }
		code.remove( consequentEnd, this.alternate.start );

		var alternateEnd = this.alternate.end;
		while ( code.original[ alternateEnd - 1 ] === ';' ) { alternateEnd -= 1; }

		if ( this.inverted ) {
			code.move( this.alternate.start, alternateEnd, this.consequent.start );
			code.move( this.consequent.start, consequentEnd, alternateEnd );

			code.prependRight( this.consequent.getLeftHandSide().start, ':' );
		} else {
			code.appendLeft( this.alternate.getLeftHandSide().start, ':' );
		}
	};

	return IfStatement;
}(Node));

var ImportDeclaration = (function (Node$$1) {
	function ImportDeclaration () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ImportDeclaration.__proto__ = Node$$1;
	ImportDeclaration.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ImportDeclaration.prototype.constructor = ImportDeclaration;

	ImportDeclaration.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'import' );
		if ( this.specifiers.length ) { program.addWord( 'from' ); }
		program.addWord( this.source.value );

		Node$$1.prototype.initialise.call( this, program, scope );
	};

	return ImportDeclaration;
}(Node));

var ImportDefaultSpecifier = (function (Node$$1) {
	function ImportDefaultSpecifier () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ImportDefaultSpecifier.__proto__ = Node$$1;
	ImportDefaultSpecifier.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ImportDefaultSpecifier.prototype.constructor = ImportDefaultSpecifier;

	ImportDefaultSpecifier.prototype.initialise = function initialise ( program, scope ) {
		this.local.declaration = this;

		scope.addDeclaration( this.local, 'import' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	return ImportDefaultSpecifier;
}(Node));

var ImportSpecifier = (function (Node$$1) {
	function ImportSpecifier () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ImportSpecifier.__proto__ = Node$$1;
	ImportSpecifier.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ImportSpecifier.prototype.constructor = ImportSpecifier;

	ImportSpecifier.prototype.initialise = function initialise ( program, scope ) {
		this.local.declaration = this;

		scope.addDeclaration( this.local, 'import' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	return ImportSpecifier;
}(Node));

var LabeledStatement = (function (Node$$1) {
	function LabeledStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) LabeledStatement.__proto__ = Node$$1;
	LabeledStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	LabeledStatement.prototype.constructor = LabeledStatement;

	LabeledStatement.prototype.getRightHandSide = function getRightHandSide () {
		return this.body.getRightHandSide();
	};

	LabeledStatement.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( this.label.name );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	LabeledStatement.prototype.minify = function minify ( code, chars ) {
		// TODO can we mangle labels?

		if ( this.body.start > this.label.end + 1 ) {
			code.overwrite( this.label.end, this.body.start, ':' );
		}

		// special case — empty body
		if ( this.body.isEmpty() ) {
			code.appendLeft( this.body.start, ';' );
			code.remove( this.body.start, this.body.end );
		} else {
			this.body.minify( code, chars );
		}
	};

	return LabeledStatement;
}(Node));

var Literal = (function (Node$$1) {
	function Literal () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) Literal.__proto__ = Node$$1;
	Literal.prototype = Object.create( Node$$1 && Node$$1.prototype );
	Literal.prototype.constructor = Literal;

	Literal.prototype.attachScope = function attachScope ( program, scope ) {
		if ( this.value === 'use strict' ) {
			var block = this.parent.parent;
			if ( block.type === 'Program' || /Function/.test( block.parent.type ) ) {
				var body = block.body;
				if ( body.indexOf( this.parent ) === 0 ) {
					// TODO use this! add pragma to blocks when minifying them
					scope.useStrict = true;
				}
			}
		}
	};

	Literal.prototype.getPrecedence = function getPrecedence () {
		return 21;
	};

	Literal.prototype.getValue = function getValue () {
		return this.value;
	};

	Literal.prototype.initialise = function initialise ( program ) {
		program.addWord( stringify( this.value ) );
	};

	Literal.prototype.minify = function minify ( code ) {
		if ( this.value === true || this.value === false ) {
			code.overwrite( this.start, this.end, this.value ? '!0' : '!1', {
				contentOnly: true
			});
		}

		else if ( typeof this.value === 'number' ) {
			code.overwrite( this.start, this.end, stringify( this.value ), {
				contentOnly: true
			});
		}
	};

	return Literal;
}(Node));

var LogicalExpression = (function (Node$$1) {
	function LogicalExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) LogicalExpression.__proto__ = Node$$1;
	LogicalExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	LogicalExpression.prototype.constructor = LogicalExpression;

	LogicalExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		var leftValue = this.left.getValue();

		if ( leftValue === UNKNOWN ) { return this.left.getLeftHandSide(); }

		return ( this.operator === '&&' ?
			( leftValue ? this.right : this.left ) :
			( leftValue ? this.left : this.right )
		).getLeftHandSide();
	};

	LogicalExpression.prototype.getPrecedence = function getPrecedence () {
		var leftValue = this.left.getValue();
		var rightValue = this.right.getValue();

		if ( leftValue === UNKNOWN || rightValue === UNKNOWN ) { return this.operator === '&&' ? 6 : 5; }

		return 20; // will be replaced by a literal
	};

	LogicalExpression.prototype.getRightHandSide = function getRightHandSide () {
		var leftValue = this.left.getValue();

		if ( leftValue === UNKNOWN ) { return this.right.getRightHandSide(); }

		return ( this.operator === '&&' ?
			( leftValue ? this.right : this.left ) :
			( leftValue ? this.left : this.right )
		).getRightHandSide();
	};

	LogicalExpression.prototype.getValue = function getValue () {
		var leftValue = this.left.getValue();
		var rightValue = this.right.getValue();

		if ( leftValue === UNKNOWN || rightValue === UNKNOWN ) { return UNKNOWN; }

		if ( this.operator === '&&' ) {
			if ( leftValue ) { return rightValue; }
		} else {
			if ( leftValue ) { return leftValue; }
			return rightValue;
		}
	};

	LogicalExpression.prototype.minify = function minify ( code, chars ) {
		var leftValue = this.left.getValue();

		if ( leftValue === UNKNOWN ) {
			if ( this.right.start > this.left.end + this.operator.length ) {
				code.overwrite( this.left.end, this.right.start, this.operator );
			}

			Node$$1.prototype.minify.call( this, code, chars );
		}

		else if ( leftValue ) {
			if ( this.operator === '&&' ) {
				code.remove( this.start, this.right.start );
				this.right.minify( code, chars );
			} else {
				code.remove( this.left.end, this.end );
				this.left.minify( code, chars );
			}
		}

		else {
			if ( this.operator === '&&' ) {
				code.remove( this.left.end, this.end );
				this.left.minify( code, chars );
			} else {
				code.remove( this.start, this.right.start );
				this.right.minify( code, chars );
			}
		}
	};

	return LogicalExpression;
}(Node));

function isValidIdentifier ( str ) {
	// TODO there's probably a bit more to it than this
	return !reservedLookup[ str ] && /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test( str );
}

function canFold ( node, parent ) {
	while ( parent.type === 'ParenthesizedExpression' ) {
		node = parent;
		parent = node.parent;
	}

	if ( parent.type === 'UpdateExpression' ) { return false; }
	if ( parent.type === 'AssignmentExpression' || /For(In|Of)Statement/.test( parent.type ) ) { return node !== parent.left; }

	return true;
}

var MemberExpression = (function (Node$$1) {
	function MemberExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) MemberExpression.__proto__ = Node$$1;
	MemberExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	MemberExpression.prototype.constructor = MemberExpression;

	MemberExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		return this.object.getLeftHandSide();
	};

	MemberExpression.prototype.getValue = function getValue () {
		var objectValue = this.object.getValue();
		if ( !objectValue || objectValue === UNKNOWN ) { return UNKNOWN; }

		var propertyValue = this.computed ? this.property.getValue() : this.property.name;
		if ( propertyValue === UNKNOWN ) { return UNKNOWN; }

		var value = objectValue[ propertyValue ];
		if ( value === UNKNOWN || typeof value === 'function' ) { return UNKNOWN; }

		return value;
	};

	MemberExpression.prototype.getPrecedence = function getPrecedence () {
		var value = this.getValue();

		return value === UNKNOWN ? 19 : getValuePrecedence( value );
	};

	MemberExpression.prototype.getRightHandSide = function getRightHandSide () {
		return this;
	};

	MemberExpression.prototype.initialise = function initialise ( program, scope ) {
		if ( !this.computed ) { program.addWord( this.property.name ); }
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	MemberExpression.prototype.minify = function minify ( code, chars ) {
		var value = this.getValue();

		if ( value && value !== UNKNOWN && canFold( this, this.parent ) ) {
			var str = stringify( value );

			if ( str !== null ) {
				code.overwrite( this.start, this.end, str );
				return;
			}
		}

		// special case — numbers
		var objectValue = this.object.getValue();
		if ( typeof objectValue === 'number' && objectValue === parseInt( objectValue, 10 ) ) {
			this.object.append( code, '.' );
		}

		if ( this.computed ) {
			var value$1 = this.property.getValue();

			if ( String( Number( value$1 ) ) === String( value$1 ) ) {
				code.overwrite( this.object.end, this.end, ("[" + value$1 + "]") );
			}

			else if ( typeof value$1 === 'string' && isValidIdentifier( value$1 ) ) {
				code.overwrite( this.object.end, this.end, ("." + value$1) );
			}

			else {
				if ( this.property.start > this.object.end + 1 ) {
					code.overwrite( this.object.end, this.property.start, '[' );
				}

				if ( this.end > this.property.end + 1 ) {
					code.overwrite( this.property.end, this.end, ']' );
				}

				this.property.minify( code, chars );
			}
		}

		else {
			if ( this.property.start > this.object.end + 1 ) {
				code.overwrite( this.object.end, this.property.start, '.' );
			}
		}

		this.object.minify( code, chars );
	};

	return MemberExpression;
}(Node));

function isAccessor ( property ) {
	return property.kind === 'get' || property.kind === 'set';
}

function minifyPropertyKey ( code, chars, property, isObject ) {
	if ( property.shorthand ) { return; }

	var separator = ( isObject && !property.method && !isAccessor( property ) ) ? ':' : '';

	if ( property.value.async || property.value.generator || property.computed || property.static || isAccessor( property ) ) {
		var prefix = '';
		if ( property.static ) { prefix += 'static'; } // only applies to class methods, obviously

		if ( isAccessor( property ) ) {
			prefix += ( property.static ) ? (" " + (property.kind)) : property.kind;
		} else if ( property.value.async ) {
			prefix += ( property.static ? ' async' : 'async' );
		} else if ( property.value.generator ) {
			prefix += '*';
		}

		if ( property.computed ) {
			prefix += '[';
		} else if ( prefix && !property.value.generator ) {
			prefix += ' ';
		}

		if ( property.key.start - property.start > prefix.length ) { code.overwrite( property.start, property.key.start, prefix ); }

		var suffix = ( property.computed ? ']' : '' ) + separator;
		if ( property.value.start - property.key.end > suffix.length ) { code.overwrite( property.key.end, property.value.start, suffix ); }
	}

	else if ( separator ) {
		if ( property.value.start - property.key.end > 1 ) { code.overwrite( property.key.end, property.value.start, separator ); }
	}

	else {
		code.remove( property.key.end, property.value.start );
	}

	property.key.minify( code, chars );
}

var MethodDefinition = (function (Node$$1) {
	function MethodDefinition () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) MethodDefinition.__proto__ = Node$$1;
	MethodDefinition.prototype = Object.create( Node$$1 && Node$$1.prototype );
	MethodDefinition.prototype.constructor = MethodDefinition;

	MethodDefinition.prototype.initialise = function initialise ( program, scope ) {
		if ( !this.computed ) { program.addWord( this.key.name ); }
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	MethodDefinition.prototype.minify = function minify ( code, chars ) {
		minifyPropertyKey( code, chars, this, false );
		this.value.minify( code, chars );
	};

	return MethodDefinition;
}(Node));

var NewExpression = (function (Node$$1) {
	function NewExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) NewExpression.__proto__ = Node$$1;
	NewExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	NewExpression.prototype.constructor = NewExpression;

	NewExpression.prototype.getPrecedence = function getPrecedence () {
		return this.arguments.length > 0 ? 19 : 18;
	};

	NewExpression.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'new' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	NewExpression.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		if ( this.arguments.length ) {
			var lastNode = this.callee;

			for ( var i = 0; i < this.arguments.length; i += 1 ) {
				var argument = this$1.arguments[i];

				if ( argument.start > lastNode.end + 1 ) { code.overwrite( lastNode.end, argument.start, i ? ',' : '(' ); }
				lastNode = argument;
			}

			if ( this.end > lastNode.end + 1 ) { code.overwrite( lastNode.end, this.end, ')' ); }
		}

		else if ( this.end > this.callee.end ) {
			code.remove( this.callee.end, this.end );
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return NewExpression;
}(Node));

var ObjectExpression = (function (Node$$1) {
	function ObjectExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ObjectExpression.__proto__ = Node$$1;
	ObjectExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ObjectExpression.prototype.constructor = ObjectExpression;

	ObjectExpression.prototype.getValue = function getValue () {
		return UNKNOWN;
	};

	ObjectExpression.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		var c = this.start;

		if ( this.properties.length ) {
			for ( var i = 0; i < this.properties.length; i += 1 ) {
				var p = this$1.properties[i];

				if ( p.start > c + 1 ) { code.overwrite( c, p.start, i ? ',' : '{' ); }

				minifyPropertyKey( code, chars, p, true );
				p.value.minify( code, chars );

				c = p.end;
			}

			if ( this.end > c + 1 ) { code.remove( c, this.end - 1 ); }
		} else if ( this.end > this.start + 2 ) {
			code.overwrite( this.start, this.end, '{}' );
		}
	};

	return ObjectExpression;
}(Node));

var ObjectPattern = (function (Node$$1) {
	function ObjectPattern () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ObjectPattern.__proto__ = Node$$1;
	ObjectPattern.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ObjectPattern.prototype.constructor = ObjectPattern;

	ObjectPattern.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		var c = this.start + 1;
		for ( var i = 0; i < this.properties.length; i += 1 ) {
			// TODO remove unused properties
			var property = this$1.properties[i];
			property.minify( code, chars );

			if ( property.start > c ) { code.overwrite( c, property.start, i ? ',' : '' ); }
			c = property.end;
		}

		code.remove( c, this.end - 1 );
	};

	return ObjectPattern;
}(Node));

function shouldRemoveParens ( expression, parent ) {
	if ( /^Object/.test( expression.getLeftHandSide().type ) || /^Object/.test( expression.getRightHandSide().type ) ) {
		return false;
	}

	if ( expression.type === 'CallExpression' ) {
		return expression.callee.type === 'FunctionExpression' && parent.type === 'ExpressionStatement';
	}

	if ( expression.type === 'FunctionExpression' ) {
		return (
			( parent.type === 'CallExpression' && parent.parent.type === 'ExpressionStatement' ) ||
			( parent.type === 'ExpressionStatement' && parent.parent.type === 'CallExpression' )
		);
	}

	// special case — `(-x)**y`
	if ( expression.type === 'UnaryExpression' && parent.type === 'BinaryExpression' && parent.operator === '**' ) {
		if ( parent.left.contains( expression ) ) { return false; }
	}

	var expressionPrecedence = expression.getPrecedence();
	var parentPrecedence = parent.getPrecedence();

	if ( parentPrecedence > expressionPrecedence ) { return false; }
	if ( expressionPrecedence > parentPrecedence ) { return true; }

	if ( expression.type === 'UnaryExpression' ) { return true; }
	if ( expression.type === 'AssignmentExpression' ) { return true; }
	if ( expression.type === 'LogicalExpression' || expression.type === 'BinaryExpression' ) {
		return ( parent.operator === '**' ? parent.right : parent.left ).contains( expression );
	}
}

var ParenthesizedExpression = (function (Node$$1) {
	function ParenthesizedExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ParenthesizedExpression.__proto__ = Node$$1;
	ParenthesizedExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ParenthesizedExpression.prototype.constructor = ParenthesizedExpression;

	ParenthesizedExpression.prototype.getLeftHandSide = function getLeftHandSide () {
		var node = this;

		while ( node.type === 'ParenthesizedExpression' ) {
			node = node.expression;
		}

		if ( shouldRemoveParens( node, this.parent ) ) { return node.getLeftHandSide(); }
		return node.parent;
	};

	ParenthesizedExpression.prototype.getRightHandSide = function getRightHandSide () {
		var node = this;

		while ( node.type === 'ParenthesizedExpression' ) {
			node = node.expression;
		}

		if ( shouldRemoveParens( node, this.parent ) ) { return node.getRightHandSide(); }
		return node.parent;
	};

	ParenthesizedExpression.prototype.getPrecedence = function getPrecedence () {
		return 20;
	};

	ParenthesizedExpression.prototype.getValue = function getValue () {
		return this.expression.getValue();
	};

	ParenthesizedExpression.prototype.minify = function minify ( code, chars ) {
		var start = this.start;
		var end = this.end;
		var parent = this.parent;

		var expression = this.expression;
		while ( expression.type === 'ParenthesizedExpression' ) { expression = expression.expression; }

		if ( shouldRemoveParens( expression, parent ) ) {
			code.remove( start, expression.start );
			code.remove( expression.end, end );
		} else {
			if ( expression.start > this.start + 1 ) { code.remove( this.start + 1, expression.start ); }
			if ( this.end > expression.end + 1 ) { code.remove( expression.end, this.end - 1 ); }
		}

		// special case (?) – IIFE
		if (
			(
				this.parent.type === 'CallExpression' &&
				this.parent.parent.type === 'ExpressionStatement' &&
				expression.type === 'FunctionExpression'
			) ||
			(
				this.parent.type === 'ExpressionStatement' &&
				expression.type === 'CallExpression' &&
				expression.callee.type === 'FunctionExpression'
			)
		) {
			expression.prepend( code, '!' ); // could be any unary operator – uglify uses !
		}

		expression.minify( code, chars );
	};

	return ParenthesizedExpression;
}(Node));

var invalidChars$1 = /[a-zA-Z$_0-9/]/;

var ReturnStatement = (function (Node$$1) {
	function ReturnStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) ReturnStatement.__proto__ = Node$$1;
	ReturnStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	ReturnStatement.prototype.constructor = ReturnStatement;

	ReturnStatement.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'return' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	ReturnStatement.prototype.minify = function minify ( code, chars ) {
		if ( !this.argument ) { return; }

		var value = this.argument.getValue();

		var needsTrailingWhitespace = value === UNKNOWN ?
			invalidChars$1.test( code.original[ this.argument.getLeftHandSide().start ] ) :
			invalidChars$1.test( stringify( value )[0] );

		if ( needsTrailingWhitespace && this.argument.start === this.start + 6 ) {
			// ensure that parenthesized expression isn't too close
			code.appendLeft( this.start + 6, ' ' );
		}

		var c = this.start + ( needsTrailingWhitespace ? 7 : 6 );
		if ( this.argument.start > c ) {
			code.remove( c, this.argument.start );
		}

		this.argument.minify( code, chars );
	};

	return ReturnStatement;
}(Node));

var SpreadElement = (function (Node$$1) {
	function SpreadElement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) SpreadElement.__proto__ = Node$$1;
	SpreadElement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	SpreadElement.prototype.constructor = SpreadElement;

	SpreadElement.prototype.getPrecedence = function getPrecedence () {
		return 1;
	};

	return SpreadElement;
}(Node));

var SwitchCase = (function (Node$$1) {
	function SwitchCase () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) SwitchCase.__proto__ = Node$$1;
	SwitchCase.prototype = Object.create( Node$$1 && Node$$1.prototype );
	SwitchCase.prototype.constructor = SwitchCase;

	SwitchCase.prototype.getRightHandSide = function getRightHandSide () {
		if ( this.consequent.length > 0 ) {
			return this.consequent[ this.consequent.length - 1 ].getRightHandSide();
		}

		return this;
	};

	SwitchCase.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( this.test ? 'case' : 'default' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	SwitchCase.prototype.minify = function minify ( code, chars ) {
		var c;

		if ( this.test ) {
			this.test.minify( code, chars );

			if ( this.test.start > this.start + 5 ) {
				code.remove( this.start + 5, this.test.start );
			}

			c = this.test.end;
		} else {
			// default
			c = this.start + 7;
		}

		this.consequent.forEach( function ( statement, i ) {
			statement.minify( code, chars );

			var separator = i ? ';' : ':'; // TODO can consequents be written as sequences?

			if ( statement.start === c ) {
				code.appendLeft( c, separator );
			} else {
				if ( code.original.slice( c, statement.start ) !== separator ) {
					code.overwrite( c, statement.start, separator );
				}
			}

			c = statement.end;
			while ( code.original[ c - 1 ] === ';' ) { c -= 1; }
		});
	};

	return SwitchCase;
}(Node));

var SwitchStatement = (function (Node$$1) {
	function SwitchStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) SwitchStatement.__proto__ = Node$$1;
	SwitchStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	SwitchStatement.prototype.constructor = SwitchStatement;

	SwitchStatement.prototype.initialise = function initialise ( program, scope ) {
		Node$$1.prototype.initialise.call( this, program, scope );

		if ( this.cases.length === 0 ) {
			var value = this.discriminant.getValue();
			this.skip = value !== UNKNOWN || this.discriminant.type === 'Identifier';
		}

		if ( !this.skip ) {
			program.addWord( 'switch' );
		}
	};

	SwitchStatement.prototype.minify = function minify ( code, chars ) {
		// special (and unlikely!) case — no cases, but a non-removable discriminant
		if ( this.cases.length === 0 ) {
			this.discriminant.minify( code, chars );
			code.remove( this.start, this.discriminant.start );
			code.remove( this.discriminant.end, this.end );
		}

		else {
			if ( this.discriminant.start > this.start + 7 ) {
				code.overwrite( this.start + 6, this.discriminant.start, '(' );
			}

			var c = this.discriminant.end;

			this.cases.forEach( function ( switchCase, i ) {
				code.remove( c, switchCase.start );
				switchCase.prepend( code, i > 0 ? ';' : '){' );

				c = switchCase.end;
				while ( code.original[ c - 1 ] === ';' ) { c -= 1; }
			});

			if ( this.end > c + 1 ) { code.overwrite( c, this.end, '}' ); }

			Node$$1.prototype.minify.call( this, code, chars );
		}
	};

	return SwitchStatement;
}(Node));

var TaggedTemplateExpression = (function (Node$$1) {
	function TaggedTemplateExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) TaggedTemplateExpression.__proto__ = Node$$1;
	TaggedTemplateExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	TaggedTemplateExpression.prototype.constructor = TaggedTemplateExpression;

	TaggedTemplateExpression.prototype.minify = function minify ( code, chars ) {
		if ( this.quasi.start > this.tag.end ) { code.remove( this.tag.end, this.quasi.start ); }
		this.quasi.minify( code, chars );
	};

	return TaggedTemplateExpression;
}(Node));

var TemplateLiteral = (function (Node$$1) {
	function TemplateLiteral () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) TemplateLiteral.__proto__ = Node$$1;
	TemplateLiteral.prototype = Object.create( Node$$1 && Node$$1.prototype );
	TemplateLiteral.prototype.constructor = TemplateLiteral;

	TemplateLiteral.prototype.getValue = function getValue () {
		var this$1 = this;

		var values = new Array( this.expressions.length );
		var i;

		for ( i = 0; i < this.expressions.length; i += 1 ) {
			var expression = this$1.expressions[i];
			var value = expression.getValue();

			if ( value === UNKNOWN ) { return UNKNOWN; }

			values[i] = value;
		}

		var result = '';

		for ( i = 0; i < this.expressions.length; i += 1 ) {
			var value$1 = values[i];

			result += this$1.quasis[i].value.raw;
			result += value$1;
		}

		result += this.quasis[i].value.raw;

		return result;
	};

	TemplateLiteral.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		if ( this.parent.type !== 'TaggedTemplateExpression' ) {
			var value = this.getValue();

			if ( value !== UNKNOWN ) {
				code.overwrite( this.start, this.end, stringify( value ) );
				return;
			}
		}

		var c = this.start;
		var i;
		for ( i = 0; i < this.expressions.length; i += 1 ) {
			var quasi = this$1.quasis[i];
			var nextQuasi = this$1.quasis[i+1];
			var expression = this$1.expressions[i];

			var value$1 = expression.getValue();
			if ( typeof value$1 === 'object' ) { // includes both UNKNOWN and known non-primitives
				expression.minify( code, chars );

				if ( expression.start > quasi.end + 2 ) {
					code.remove( quasi.end + 2, expression.start );
				}

				c = ( nextQuasi ? nextQuasi.start : this$1.end ) - 1;
				if ( expression.end < c ) { code.remove( expression.end, c ); }
			} else {
				code.overwrite( quasi.end, expression.end, String( value$1 ) );
				c = ( nextQuasi ? nextQuasi.start : this$1.end - 1 );
				if ( expression.end < c ) { code.remove( expression.end, c ); }
			}
		}

		var lastQuasi = this.quasis[i];

		if ( lastQuasi.start > c + 1 ) {
			code.remove( c, lastQuasi.start - 1 );
		}
	};

	return TemplateLiteral;
}(Node));

var TryStatement = (function (Node$$1) {
	function TryStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) TryStatement.__proto__ = Node$$1;
	TryStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	TryStatement.prototype.constructor = TryStatement;

	TryStatement.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'try' );
		if ( this.finalizer ) { program.addWord( 'finally' ); }

		Node$$1.prototype.initialise.call( this, program, scope );
	};

	TryStatement.prototype.minify = function minify ( code, chars ) {
		if ( this.block.start > this.start + 3 ) { code.remove( this.start + 3, this.block.start ); }

		if ( this.handler ) {
			if ( this.handler.start > this.block.end ) {
				code.remove( this.block.end, this.handler.start );
			}

			if ( this.finalizer && this.finalizer.start > this.handler.end + 7 ) {
				code.overwrite( this.handler.end, this.finalizer.start, 'finally' );
			}
		} else {
			if ( this.finalizer.start > this.block.end + 7 ) {
				code.overwrite( this.block.end, this.finalizer.start, 'finally' );
			}
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return TryStatement;
}(Node));

var calculators$1 = {
	'!': function (x) { return !x; },
	'~': function (x) { return ~x; },
	'+': function (x) { return +x; },
	'-': function (x) { return -x; },
	'typeof': function (x)  { return typeof x; },
	'void'  : function (x)  { return void x; },
	'delete': function () { return UNKNOWN; }
};

var UnaryExpression = (function (Node$$1) {
	function UnaryExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) UnaryExpression.__proto__ = Node$$1;
	UnaryExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	UnaryExpression.prototype.constructor = UnaryExpression;

	UnaryExpression.prototype.getPrecedence = function getPrecedence () {
		var value = this.getValue();
		return value === UNKNOWN ? 16 : getValuePrecedence( value );
	};

	UnaryExpression.prototype.getValue = function getValue () {
		var arg = this.argument.getValue();

		if ( arg === UNKNOWN ) { return UNKNOWN; }
		return calculators$1[ this.operator ]( arg );
	};

	UnaryExpression.prototype.minify = function minify ( code, chars ) {
		var value = this.getValue();
		if ( value !== UNKNOWN ) {
			code.overwrite( this.start, this.end, stringify( value ) );
		}

		else {
			var len = this.operator.length;
			var start = this.start + len;

			var insertWhitespace = len > 1 && this.argument.getLeftHandSide().type !== 'ParenthesizedExpression';
			if ( insertWhitespace ) { code.appendLeft( start, ' ' ); }

			code.remove( start, this.argument.start );

			Node$$1.prototype.minify.call( this, code, chars );
		}
	};

	return UnaryExpression;
}(Node));

var UpdateExpression = (function (Node$$1) {
	function UpdateExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) UpdateExpression.__proto__ = Node$$1;
	UpdateExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	UpdateExpression.prototype.constructor = UpdateExpression;

	UpdateExpression.prototype.getPrecedence = function getPrecedence () {
		return this.prefix ? 16 : 17;
	};

	UpdateExpression.prototype.initialise = function initialise ( program, scope ) {
		if ( this.argument.type === 'Identifier' ) {
			var declaration = scope.findDeclaration( this.argument.name );
			if ( declaration && declaration.kind === 'const' ) {
				throw new CompileError( this, ((this.argument.name) + " is read-only") );
			}
		}

		Node$$1.prototype.initialise.call( this, program, scope );
	};

	return UpdateExpression;
}(Node));

function compatibleDeclarations ( a, b ) {
	if ( a === b ) { return true; }
	if ( a === 'var' || b === 'var' ) { return false; }
	return true;
}

var VariableDeclaration = (function (Node$$1) {
	function VariableDeclaration () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) VariableDeclaration.__proto__ = Node$$1;
	VariableDeclaration.prototype = Object.create( Node$$1 && Node$$1.prototype );
	VariableDeclaration.prototype.constructor = VariableDeclaration;

	VariableDeclaration.prototype.attachScope = function attachScope ( program, scope ) {
		this.declarations.forEach( function (declarator) {
			declarator.attachScope( program, scope );
		});

		scope.functionScope.varDeclarationNodes.push( this );
	};

	VariableDeclaration.prototype.initialise = function initialise ( program, scope ) {
		// TODO `program.addWord(kind)`, but only if this declaration is included...

		var _scope = scope;
		if ( this.kind === 'var' ) { while ( _scope.isBlockScope ) { _scope = _scope.parent; } }

		if ( !_scope.parent ) {
			this.skip = false;
		}

		this.declarations.forEach( function (declarator) {
			if ( !_scope.parent ) {
				// only initialise top-level variables. TODO unless we're in e.g. module mode
				declarator.initialise( program, scope );
			} else {
				if ( declarator.init ) { declarator.init.initialise( program, scope ); }
			}
		});
	};

	VariableDeclaration.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		if ( this.collapsed ) { return; }

		// collapse consecutive declarations into one
		var declarations = this.declarations;

		if ( this.parent.type === 'BlockStatement' || this.parent.type === 'Program' ) {
			var index = this.parent.body.indexOf( this ) + 1;
			do {
				var next = this$1.parent.body[ index ];
				if ( next && next.type === 'VariableDeclaration' && compatibleDeclarations( next.kind, this$1.kind ) ) {
					declarations.push.apply( declarations, next.declarations );
					next.collapsed = true;
				} else {
					break;
				}

				index += 1;
			} while ( index < this.parent.body.length );
		}

		var allDupes = declarations.every( function (declarator) {
			if ( declarator.skip ) { return true; }

			var names = extractNames( declarator.id );
			return names.length > 0 && names.every( function (identifier) {
				return identifier.isDuplicate;
			});
		});

		var kind = this.kind === 'const' ? 'let' : this.kind; // TODO preserve const at top level?
		var c = this.start;
		var first = true;
		var needsKeyword = !allDupes;

		for ( var i = 0; i < declarations.length; i += 1 ) {
			var declarator = declarations[i];

			if ( declarator.skip ) {
				if ( !declarator.init || declarator.init.skip ) { continue; }

				declarator.init.minify( code, chars );

				// we have a situation like `var unused = x()` — need to preserve `x()`
				code.overwrite( c, declarator.init.start, first ? '' : ';' );
				needsKeyword = true;
			} else {
				declarator.minify( code, chars );

				var separator = needsKeyword ?
					( first ? kind : (";" + kind) ) + ( declarator.id.type === 'Identifier' ? ' ' : '' ) :
					first ? '' : ',';

				code.overwrite( c, declarator.start, separator );
				needsKeyword = false;
			}

			c = declarator.end;
			first = false;
		}

		if ( this.end > c + 1 ) { code.remove( c, this.end - 1 ); }

		// we may have been asked to declare some additional vars, if they were
		// declared inside blocks that have been removed
		if ( this.rideAlongs ) { code.appendLeft( c, "," + this.rideAlongs.join( ',' ) ); }
	};

	return VariableDeclaration;
}(Node));

function mightHaveSideEffects ( node ) {
	// TODO this can get way more sophisticated
	if ( node.type === 'Identifier' || node.type === 'Literal' || /FunctionExpression/.test( node.type ) ) { return false; }
	return true;
}

var VariableDeclarator = (function (Node$$1) {
	function VariableDeclarator () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) VariableDeclarator.__proto__ = Node$$1;
	VariableDeclarator.prototype = Object.create( Node$$1 && Node$$1.prototype );
	VariableDeclarator.prototype.constructor = VariableDeclarator;

	VariableDeclarator.prototype.activate = function activate () {
		if ( this.activated ) { return; }
		this.activated = true;

		this.skip = this.parent.skip = false;
		this.id.initialise( this.program, this.scope );
		if ( this.init ) { this.init.initialise( this.program, this.scope ); }
	};

	VariableDeclarator.prototype.attachScope = function attachScope ( program, scope ) {
		var this$1 = this;

		this.program = program;
		this.scope = scope;

		var kind = this.parent.kind;

		this.id.attachScope( program, scope );

		if ( this.init ) {
			this.init.attachScope( program, scope );

			if ( mightHaveSideEffects( this.init ) ) {
				this.parent.skip = false;
			}
		}

		extractNames( this.id ).forEach( function (node) {
			node.declaration = this$1;
			scope.addDeclaration( node, kind );
		});
	};

	VariableDeclarator.prototype.minify = function minify ( code, chars ) {
		if ( this.init ) {
			if ( this.init.start > this.id.end + 1 ) { code.overwrite( this.id.end, this.init.start, '=' ); }
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return VariableDeclarator;
}(Node));

var WhileStatement = (function (Node$$1) {
	function WhileStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) WhileStatement.__proto__ = Node$$1;
	WhileStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	WhileStatement.prototype.constructor = WhileStatement;

	WhileStatement.prototype.getRightHandSide = function getRightHandSide () {
		return this.body.getRightHandSide();
	};

	WhileStatement.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'while' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	WhileStatement.prototype.minify = function minify ( code, chars ) {
		if ( this.test.start > this.start + 6 ) {
			code.overwrite( this.start + 5, this.test.start, '(' );
		}

		if ( this.body.start > this.test.end + 1 ) {
			code.overwrite( this.test.end, this.body.start, ')' );
		}

		// special case — empty body
		if ( this.body.isEmpty() ) {
			code.appendLeft( this.body.start, ';' );
			code.remove( this.body.start, this.body.end );
		}

		Node$$1.prototype.minify.call( this, code, chars );
	};

	return WhileStatement;
}(Node));

var YieldExpression = (function (Node$$1) {
	function YieldExpression () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) YieldExpression.__proto__ = Node$$1;
	YieldExpression.prototype = Object.create( Node$$1 && Node$$1.prototype );
	YieldExpression.prototype.constructor = YieldExpression;

	YieldExpression.prototype.getPrecedence = function getPrecedence () {
		return 2;
	};

	YieldExpression.prototype.initialise = function initialise ( program, scope ) {
		program.addWord( 'yield' );
		Node$$1.prototype.initialise.call( this, program, scope );
	};

	return YieldExpression;
}(Node));

var types = {
	ArrayExpression: ArrayExpression,
	ArrayPattern: ArrayExpression,
	ArrowFunctionExpression: ArrowFunctionExpression,
	AssignmentExpression: AssignmentExpression,
	BinaryExpression: BinaryExpression,
	CallExpression: CallExpression,
	CatchClause: CatchClause,
	ClassBody: ClassBody,
	ClassDeclaration: ClassDeclaration,
	ClassExpression: ClassExpression,
	ConditionalExpression: ConditionalExpression,
	DoWhileStatement: DoWhileStatement,
	EmptyStatement: EmptyStatement,
	ExpressionStatement: ExpressionStatement,
	ForStatement: ForStatement,
	ForInStatement: ForInOfStatement,
	ForOfStatement: ForInOfStatement,
	FunctionDeclaration: FunctionDeclaration,
	FunctionExpression: FunctionExpression,
	Identifier: Identifier,
	IfStatement: IfStatement,
	ImportDeclaration: ImportDeclaration,
	ImportDefaultSpecifier: ImportDefaultSpecifier,
	ImportSpecifier: ImportSpecifier,
	LabeledStatement: LabeledStatement,
	Literal: Literal,
	LogicalExpression: LogicalExpression,
	MemberExpression: MemberExpression,
	MethodDefinition: MethodDefinition,
	NewExpression: NewExpression,
	ObjectExpression: ObjectExpression,
	ObjectPattern: ObjectPattern,
	ParenthesizedExpression: ParenthesizedExpression,
	ReturnStatement: ReturnStatement,
	SpreadElement: SpreadElement,
	SwitchCase: SwitchCase,
	SwitchStatement: SwitchStatement,
	TaggedTemplateExpression: TaggedTemplateExpression,
	TemplateLiteral: TemplateLiteral,
	TryStatement: TryStatement,
	UnaryExpression: UnaryExpression,
	UpdateExpression: UpdateExpression,
	VariableDeclaration: VariableDeclaration,
	VariableDeclarator: VariableDeclarator,
	WhileStatement: WhileStatement,
	YieldExpression: YieldExpression
};

// TODO make this a method of nodes
function breaksExecution ( node ) {
	if ( node.type === 'ReturnStatement' || node.type === 'BreakStatement' || node.type === 'ContinueStatement' ) {
		return node;
	}

	if ( node.type === 'BlockStatement' ) {
		var i = node.body.length;
		while ( i-- ) {
			var maybeReturnNode = breaksExecution( node.body[i] );
			if ( maybeReturnNode ) { return maybeReturnNode; }
		}
	}

	if ( node.type === 'IfStatement' ) {
		var testValue = node.test.getValue();

		if ( testValue === UNKNOWN ) { return null; }

		if ( testValue ) { // if ( true ) {...}
			return breaksExecution( node.consequent );
		}

		// if ( false ) {...}
		if ( !node.alternate ) { return null; }

		return breaksExecution( node.alternate );
	}
}

var shouldPreserveAfterReturn = {
	FunctionDeclaration: true,
	VariableDeclaration: true,
	ClassDeclaration: true
};

var allowsBlockLessStatement = {
	BlockStatement: true,
	ForStatement: true,
	ForInStatement: true,
	ForOfStatement: true,
	IfStatement: true,
	WhileStatement: true
};

function endsWithCurlyBrace ( statement ) { // TODO can we just use getRightHandSide?
	if ( statement.type === 'IfStatement' ) {
		if ( statement.rewriteAsSequence ) { return false; }

		if ( statement.alternate ) {
			if ( statement.alternate.type === 'IfStatement' ) {
				return endsWithCurlyBrace( statement.alternate );
			}

			if ( statement.alternate.type !== 'BlockStatement' ) { return false; }
			if ( statement.alternate.canRemoveCurlies() ) { return false; }

			return true;
		}

		return statement.consequent.type === 'BlockStatement' && !statement.consequent.canRemoveCurlies();
	}

	if ( /^(?:For(?:In|Of)?|While)Statement/.test( statement.type ) ) {
		return statement.body.type === 'BlockStatement' && !statement.body.canRemoveCurlies();
	}

	if ( statement.type === 'SwitchStatement' ) { return true; }

	return /(?:Class|Function)Declaration/.test( statement.type );
}

function isVarDeclaration ( node ) {
	return node.kind === 'var';
}

var BlockStatement = (function (Node$$1) {
	function BlockStatement () {
		Node$$1.apply(this, arguments);
	}

	if ( Node$$1 ) BlockStatement.__proto__ = Node$$1;
	BlockStatement.prototype = Object.create( Node$$1 && Node$$1.prototype );
	BlockStatement.prototype.constructor = BlockStatement;

	BlockStatement.prototype.attachScope = function attachScope ( program, parent ) {
		var this$1 = this;

		this.parentIsFunction = /Function/.test( this.parent.type );

		if ( this.parentIsFunction ) {
			this.scope = parent;
		} else {
			this.scope = new Scope({
				block: true,
				parent: parent
			});
		}

		for ( var i = 0; i < this.body.length; i += 1 ) {
			this$1.body[i].attachScope( program, this$1.scope );
		}
	};

	BlockStatement.prototype.canRemoveCurlies = function canRemoveCurlies () {
		return allowsBlockLessStatement[ this.parent.type ] && ( this.canSequentialise() || ( this.body.length > 0 && this.body.every( isVarDeclaration ) ) );
	};

	// TODO memoize
	BlockStatement.prototype.canSequentialise = function canSequentialise () {
		var this$1 = this;

		for ( var i = 0; i < this.body.length; i += 1 ) {
			var node = this$1.body[i];
			if ( !node.skip && !node.canSequentialise() ) { return false; } // TODO what if it's a block with a late-activated declaration...
		}

		return true;
	};

	// TODO what is this about?
	BlockStatement.prototype.findVarDeclarations = function findVarDeclarations ( varsToHoist ) {
		this.body.forEach( function (node) {
			if ( node.type === 'VariableDeclaration' && node.kind === 'var' ) {
				node.declarations.forEach( function (declarator) {
					extractNames( declarator.id ).forEach( function (identifier) {
						varsToHoist[ identifier.name ] = true;
					});
				});
			} else {
				node.findVarDeclarations( varsToHoist );
			}
		});
	};

	BlockStatement.prototype.getLeftHandSide = function getLeftHandSide () {
		if ( this.body.length > 0 && ( this.canSequentialise() || this.body.every( isVarDeclaration ) ) ) {
			return this.body[0].getLeftHandSide();
		}
		return this;
	};

	BlockStatement.prototype.getRightHandSide = function getRightHandSide () {
		if ( this.body.length > 0 && ( this.canSequentialise() || this.body.every( isVarDeclaration ) ) ) {
			return this.body[this.body.length - 1].getRightHandSide();
		}
		return this;
	};

	BlockStatement.prototype.initialise = function initialise ( program, scope ) {
		var this$1 = this;

		var executionIsBroken = false;
		var maybeReturnNode;
		var hasDeclarationsAfterBreak = false;

		var canCollapseReturns = this.parentIsFunction;
		var returnStatements = [];

		for ( var i = 0; i < this.body.length; i += 1 ) {
			var node = this$1.body[i];

			if ( executionIsBroken ) {
				if ( shouldPreserveAfterReturn[ node.type ] ) {
					hasDeclarationsAfterBreak = true;
					node.initialise( program, this$1.scope || scope );
				}

				continue;
			}

			maybeReturnNode = breaksExecution( node );
			if ( maybeReturnNode ) { executionIsBroken = true; }

			node.initialise( program, this$1.scope || scope );

			if ( canCollapseReturns ) {
				if ( node.preventsCollapsedReturns( returnStatements ) ) {
					canCollapseReturns = false;
				} else {
					// console.log( `${node.type} preventsCollapsedReturns`)
				}
			}
		}

		this.collapseReturnStatements = canCollapseReturns && returnStatements.length;
		this.returnStatements = returnStatements;

		// if `return` is the last line of a function, remove it
		if ( maybeReturnNode && this.parentIsFunction && !hasDeclarationsAfterBreak ) {
			// TODO also capture `return undefined` and `return void 0` etc?
			if ( !maybeReturnNode.argument ) {
				maybeReturnNode.skip = true;
			}
		}
	};

	// TODO remove block.isEmpty() in favour of block.skip — this is a hangover from
	// when variables could get activated after we'd finished initialising a block
	BlockStatement.prototype.isEmpty = function isEmpty () {
		var this$1 = this;

		for ( var i = 0; i < this.body.length; i += 1 ) {
			var node = this$1.body[i];
			if ( !node.skip ) { return false; }
		}

		return true;
	};

	BlockStatement.prototype.minify = function minify ( code, chars ) {
		var this$1 = this;

		if ( this.scope ) {
			this.scope.mangle( code, chars );
		}

		var insertedVarDeclaration = '';

		if ( this.parentIsFunction || this.parent.type === 'Root' ) {
			// if there are any vars inside removed blocks, they need
			// to be declared here
			var hoisted = [];
			this.scope.hoistedVars.forEach( function (name) {
				var hoistedVar = this$1.scope.declarations[name];
				if ( hoistedVar.activated ) {
					hoisted.push( hoistedVar.alias || hoistedVar.name );
				}
			});

			if ( hoisted.length ) {
				// see if there's an existing var declaration we can glom these onto
				var varDeclaration = this.scope.varDeclarationNodes.find( function (node) {
					while ( node !== this$1 ) {
						if ( node.skip ) { return false; }
						node = node.parent;
					}

					return true;
				});

				if ( varDeclaration ) {
					varDeclaration.rideAlongs = hoisted;
				} else {
					insertedVarDeclaration = "var " + (hoisted.join(',')) + ";";
				}
			}
		}

		var sequentialise = !this.parentIsFunction && this.canSequentialise();
		var removeCurlies = this.canRemoveCurlies();
		var separator = sequentialise ? ',' : ';';

		// remove leading whitespace
		var lastEnd = ( this.parent.type === 'Root' || removeCurlies ) ? this.start : this.start + 1;
		var end = ( this.parent.type === 'Root' || removeCurlies ) ? this.end : this.end - 1;

		var statements = this.body.filter( function (statement) { return !statement.skip; } );
		var lastStatement;

		if ( statements.length ) {
			var nextSeparator = ( ( this.scope && this.scope.useStrict && ( !this.scope.parent || !this.scope.parent.useStrict ) ) ?
				'"use strict";' :
				'' ) + insertedVarDeclaration;

			for ( var i = 0; i < statements.length; i += 1 ) {
				var statement = statements[i];

				statement.minify( code, chars );

				if ( !statement.collapsed ) {
					if ( statement.start > lastEnd ) { code.remove( lastEnd, statement.start ); }

					if ( nextSeparator ) {
						code.appendLeft( lastStatement ? lastStatement.getRightHandSide().end : lastEnd, nextSeparator );
					}

					if ( statement.removed ) {
						nextSeparator = '';
					} else {
						nextSeparator = endsWithCurlyBrace( statement ) ? '' : separator;
					}
				}

				lastEnd = statement.end;

				// remove superfluous semis (TODO is this necessary?)
				while ( code.original[ lastEnd - 1 ] === ';' ) { lastEnd -= 1; }

				if ( statement.removed ) {
					nextSeparator = '';
				} else {
					nextSeparator = endsWithCurlyBrace( statement ) ? '' : separator;
				}

				lastStatement = statement;
			}

			if ( end > lastEnd ) { code.remove( lastEnd, end ); }
		} else {
			// empty block
			if ( removeCurlies || this.parent.type === 'Root' ) {
				code.remove( this.start, this.end );
			} else if ( this.end > this.start + 2 ) {
				code.remove( this.start + 1, this.end - 1 );
			}
		}
	};

	return BlockStatement;
}(Node));

var keys = {
	Program: [ 'body' ],
	Literal: []
};

function wrap ( raw, parent ) {
	if ( !raw ) { return; }

	if ( 'length' in raw ) {
		var i = raw.length;
		while ( i-- ) { wrap( raw[i], parent ); }
		return;
	}

	// with e.g. shorthand properties, key and value are
	// the same node. We don't want to wrap an object twice
	if ( raw.__wrapped ) { return; }
	raw.__wrapped = true;

	if ( !keys[ raw.type ] ) {
		keys[ raw.type ] = Object.keys( raw ).filter( function (key) { return typeof raw[ key ] === 'object'; } );
	}

	raw.skip = true;
	raw.parent = parent;
	raw.program = parent.program || parent;
	raw.depth = parent.depth + 1;
	raw.keys = keys[ raw.type ];
	raw.indentation = undefined;

	for ( var i$1 = 0, list = keys[ raw.type ]; i$1 < list.length; i$1 += 1 ) {
		var key = list[i$1];

		wrap( raw[ key ], raw );
	}

	raw.program.magicString.addSourcemapLocation( raw.start );
	raw.program.magicString.addSourcemapLocation( raw.end );

	var type = ( raw.type === 'BlockStatement' ? BlockStatement : types[ raw.type ] ) || Node;
	raw.__proto__ = type.prototype;
}

function check ( magicString, ast ) {
	var code = magicString.toString();

	try {
		parse$1( code );
	} catch ( err ) {
		var map = magicString.generateMap();
		var ref = err.loc;
		var line = ref.line;
		var column = ref.column;
		var snippet = code.slice( Math.max( 0, err.pos - 35 ), Math.min( code.length, err.pos + 35 ) );

		var mappings = sourcemapCodec.decode( map.mappings );
		var segments = mappings[ line - 1 ];

		var message = err.message;
		var repro;

		for ( var i = 0; i < segments.length; i += 1 ) {
			var segment = segments[i];
			if ( segment[0] >= column ) {
				var sourceCodeLine = segment[2];
				var sourceCodeColumn = segment[3];

				message = "Butternut generated invalid JS: code in source file near (" + (sourceCodeLine + 1) + ":" + sourceCodeColumn + ") became\n..." + snippet + "...";
				repro = createRepro( magicString.original, ast, sourceCodeLine, sourceCodeColumn );

				break;
			}
		}

		var err2 = new Error( message );
		err2.check = true;
		err2.repro = repro;
		err2.output = code;

		throw err2;
	}
}

function createRepro ( source, ast, line, column ) {
	var lines = source.split( '\n' );

	var c = 0;
	for ( var i = 0; i < line; i += 1 ) { c += lines[i].length + 1; }
	c += column;

	var node = zoomIn( ast, c );

	do {
		node = zoomOut( node );

		var slice = source.slice( node.start, node.end );
		var ast$1 = parse$1( slice );

		var ref = new Program( slice, ast$1, null ).export({});
		var code = ref.code;

		try {
			parse$1( code );
		} catch ( err ) {
			return {
				input: deindent( slice, source, node.start ),
				output: code,
				pos: c,
				loc: {
					line: line,
					column: column
				}
			};
		}
	} while ( node );
}

function zoomIn ( node, c ) {
	if ( !node ) { return null; }

	if ( c < node.start ) { return null; }
	if ( c > node.end ) { return null; }

	var k = keys[ node.type ];
	for ( var i = 0; i < k.length; i += 1 ) {
		var key = k[i];

		if ( Array.isArray( node[key] ) ) {
			var body = node[key];

			for ( var j = 0; j < body.length; j += 1 ) {
				if ( body[j] ) {
					if ( body[j].start > c ) { return zoomIn( body[j], body[j].start ); }

					var child = zoomIn( body[j], c );
					if ( child ) { return child; }
				}
			}
		} else {
			var child$1 = zoomIn( node[key], c );
			if ( child$1 ) { return child$1; }
		}
	}

	return node;
}

function zoomOut ( node ) {
	while ( !/Statement|Declaration/.test( node.parent.type ) ) {
		if ( !node.parent ) { return null; }
		node = node.parent;
	}

	return node.parent;
}

function deindent ( slice, source, start ) {
	var c = start;
	while ( /[ \t]/.test( source[c-1] ) ) { c -= 1; }

	var indent = source.slice( c, start );

	if ( indent ) {
		var pattern = new RegExp( ("^" + indent), 'gm' );
		return slice.replace( pattern, '' );
	}

	return slice;
}

var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$0123456789'.split('');
var digit = /\d/;

var naturalOrder = {};
chars.forEach( function ( char, i ) {
	naturalOrder[char] = i;
});

function Program ( source, ast, options, stats ) {
	var this$1 = this;

	this.options = options;
	this.stats = stats;
	this.type = 'Root';

	this.source = source;
	this.magicString = new MagicString( source );
	this.ast = ast;
	this.depth = 0;

	wrap( this.body = ast, this );
	this.body.__proto__ = BlockStatement.prototype;
	this.templateElements = [];
	this.body.scope = new Scope({
		block: false,
		parent: null
	});

	this.body.body.forEach( function (node) {
		node.attachScope( this$1, this$1.body.scope );
	});

	this.charFrequency = {};
	chars.forEach( function (char) {
		this$1.charFrequency[char] = 0;
	});

	this.body.initialise( this, this.body.scope );
	chars.sort( function ( a, b ) {
		if ( digit.test( a ) && !digit.test( b ) ) { return 1; }
		if ( digit.test( b ) && !digit.test( a ) ) { return -1; }
		return ( this$1.charFrequency[b] - this$1.charFrequency[a] ) || ( naturalOrder[a] - naturalOrder[b] );
	});

	this.body.minify( this.magicString, chars );
	
}

Program.prototype = {
	addWord: function addWord ( word ) {
		var this$1 = this;

		for ( var i = 0; i < word.length; i += 1 ) {
			this$1.charFrequency[word[i]] += 1;
		}
	},

	export: function export$1 ( options ) {
		var this$1 = this;

		var stats = this.stats;

		var code = this.magicString.toString();
		if ( options.check ) {
			check( this.magicString, this.ast );
		}

		var map = options.sourceMap !== false ? this.magicString.generateMap({
			file: options.file,
			source: options.source,
			includeContent: options.includeContent !== false
		}) : null;
		if ( false && this.magicString.stats ) {
			Object.keys( this.magicString.stats ).forEach( function (stat) {
				stats[ stat ] = this$1.magicString.stats[ stat ];
			});
		}

		return { code: code, map: map, stats: stats };
	}
};

var Stats = function Stats () {
	Object.defineProperties( this, {
		startTimes: { value: {} }
	});
};

Stats.prototype.time = function time ( label ) {
	this.startTimes[ label ] = process.hrtime();
};

Stats.prototype.timeEnd = function timeEnd ( label ) {
	var elapsed = process.hrtime( this.startTimes[ label ] );

	if ( !this[ label ] ) { this[ label ] = 0; }
	this[ label ] += elapsed[0] * 1e3 + elapsed[1] * 1e-6;
};

var version = "0.4.6";

function squash ( source, options ) {
	if ( options === void 0 ) options = {};

	var ast;
	var stats = null;

	try {
		ast = parse$1( source );
		
	} catch ( err ) {
		err.snippet = getSnippet( source, err.loc );
		throw err;
	}

	return new Program( source, ast, options, stats ).export( options );
}

exports.squash = squash;
exports.VERSION = version;
//# sourceMappingURL=butternut.cjs.js.map
