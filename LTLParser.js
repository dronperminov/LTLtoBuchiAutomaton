const NOT = "¬"
const AND = "∧"
const OR = "∨"
const XOR = "⊕"
const SHEFFER = "|"
const PIRS = "↓"
const IMPL = "→"
const EQUAL = "≡"
const UNTIL = "U"
const RELEASE = "R"

const NEXT = "X"
const GLOBALLY = "G"
const FUTURE = "F"

const ONE = "1"
const ZERO = "0"

function LTLParser(expression) {
    this.expression = expression // удаляем из выражения пробельные символы

    this.InitFunctions() // инциализируем функции
    this.InitOperators() // инциализируем операции
    this.InitConstants() // инициализируем константы
    this.InitReplacements()
    this.InitRegExp() // инициализируем регулярное выражение
    this.SplitToLexemes() // разбиваем на лексемы
    this.ConvertToRPN() // получаем польскую запись
}

// инициализация функций
LTLParser.prototype.InitFunctions = function() {
    this.functions = {}

    this.functions[GLOBALLY] = function(x) { throw "G called" }
    this.functions[FUTURE] = function(x) { throw "F called" }
    this.functions[NEXT] = function(x) { throw "X called" }
}

// инициализация операций
LTLParser.prototype.InitOperators = function() {
    this.operators = {}

    this.operators[AND] = function(x, y) { return x && y }
    this.operators[OR] = function(x, y) { return x || y }
    this.operators[XOR] = function(x, y) { return x == y ? 0 : 1 }
    this.operators[EQUAL] = function(x, y) { return x == y ? 1 : 0 }
    this.operators[IMPL] = function(x, y) { return (1 - x) || y }
    this.operators[PIRS] = function(x, y) { return (1 - x) && (1 - y) }
    this.operators[SHEFFER] = function(x, y) { return (1 - x) || (1 - y) }
    this.operators[UNTIL] = function(x, y) { throw "U called" }
    this.operators[RELEASE] = function(x, y) { throw "R called" }
}

// инициализация констант
LTLParser.prototype.InitConstants = function() {
    this.constants = {}

    this.constants["ZERO"] = 0
    this.constants["ONE"] = 1
}

// инициализация правил замены
LTLParser.prototype.InitReplacements = function() {
    this.replacementRules = [
        ["<->", EQUAL],
        ["==", EQUAL],
        ["=", EQUAL],
        ["->", IMPL],
        ["+", OR],
        ["||", OR],
        ["↑", SHEFFER],
        ["*", AND],
        ["&", AND],
        ["^", XOR],
        ["!", NOT],
        ["-", NOT],
        ["~", NOT],
    ]
}

// инициализация регулярного выражения
LTLParser.prototype.InitRegExp = function() {
    let number = "1|0" // вещественные числа
    let operators = Object.keys(this.operators).map(function(x) { return x.length == 1 ? "\\" + x : x }).join("|") // операции
    let functions = Object.keys(this.functions).join("|") // функции
    let constants = Object.keys(this.constants).join("|") // константы
    let variables = "[a-z][a-z\\d]*" // переменные

    let parts = [ number, "\\(|\\)|\\¬", operators, functions, constants, variables, ","]

    this.regexp = new RegExp(parts.join("|"), "gi")
}

// парсинг на лексемы с проверкой на корректность
LTLParser.prototype.SplitToLexemes = function() {
    for (let i = 0; i < this.replacementRules.length; i++) {
        let from = this.replacementRules[i][0]
        let to = this.replacementRules[i][1]

        while (this.expression.indexOf(from) > -1)
            this.expression = this.expression.replace(from, to)
    }

    this.lexemes = this.expression.match(this.regexp) // разбиваем на лексемы

    if (this.lexemes.join("") != this.expression.replace(/\s/g, "")) // если выражения не совпадают
        throw "Unknown characters in expression"; // значит есть некорректные символы
}

// проверка на функцию
LTLParser.prototype.IsFunction = function(lexeme) {
    return lexeme in this.functions
}

// проверка на операцию
LTLParser.prototype.IsOperator = function(lexeme) {
    return lexeme in this.operators
}

// проверка на константу
LTLParser.prototype.IsConstant = function(lexeme) {
    return lexeme in this.constants
}

// проверка на число
LTLParser.prototype.IsNumber = function(lexeme) {
    return lexeme == ZERO || lexeme == ONE
}

// проверка на переменную
LTLParser.prototype.IsVariable = function(lexeme) {
    return lexeme.match(/^([a-z][a-z\d]*)/gi) != null
}

// получение приоритета операции
LTLParser.prototype.GetPriority = function(lexeme) {
    if (this.IsFunction(lexeme))
        return 9

    if (lexeme == RELEASE || lexeme == UNTIL)
        return 8

    if (lexeme == NOT)
        return 7

    if (lexeme == AND)
        return 6

    if (lexeme == OR || lexeme == XOR)
        return 5

    if (lexeme == SHEFFER)
        return 4

    if (lexeme == PIRS)
        return 3

    if (lexeme == IMPL)
        return 2

    if (lexeme == EQUAL)
        return 1

    return 0
}

// проверка, что текущая лексема менее приоритетна лексемы на вершине стека
LTLParser.prototype.IsMorePriority = function(curr, top) {
    if (curr == NOT)
        return this.GetPriority(top) > this.GetPriority(curr)

    return this.GetPriority(top) >= this.GetPriority(curr)
}

// получение польской записи
LTLParser.prototype.ConvertToRPN = function() {
    this.rpn = []
    this.variables = {}
    let stack = []

    for (let lexeme of this.lexemes.values()) {
        if (this.IsNumber(lexeme) || this.IsConstant(lexeme)) {
            this.rpn.push(lexeme)
        }
        else if (this.IsFunction(lexeme)) {
            stack.push(lexeme)
        }
        else if (this.IsOperator(lexeme) || lexeme == NOT) {
            while (stack.length > 0 && this.IsMorePriority(lexeme, stack[stack.length - 1]))
                this.rpn.push(stack.pop())

            stack.push(lexeme)
        }
        else if (this.IsVariable(lexeme)) {
            this.rpn.push(lexeme)
            this.variables[lexeme] = 0
        }
        else if (lexeme == ",") {
            while (stack.length > 0 && stack[stack.length - 1] != "(")
                this.rpn.push(stack.pop())

            if (stack.length == 0)
                throw "Incorrect expression"
        }
        else if (lexeme == "(") {
            stack.push(lexeme)
        }
        else if (lexeme == ")") {
            while (stack.length > 0 && stack[stack.length - 1] != "(")
                this.rpn.push(stack.pop())

            if (stack.length == 0)
                throw "Incorrect expression: brackets are disbalanced"

            stack.pop()

            if (stack.length > 0 && this.IsFunction(stack[stack.length - 1]))
                this.rpn.push(stack.pop())
        }
        else
            throw "Incorrect expression: unknown lexeme '" + lexeme + "'"
    }

    while (stack.length > 0) {
        if (stack[stack.length - 1] == "(")
            throw "Incorrect expression: brackets are disbalanced"

        this.rpn.push(stack.pop())
    }
}

// перевод выражения в польской записи в строку
LTLParser.prototype.ToStringRPN = function(rpn) {
    let stack = []
    let priorities = []

    for (let lexeme of rpn.values()) {
        if (this.IsOperator(lexeme)) {
            let arg2 = stack.pop()
            let arg1 = stack.pop()

            let priority2 = priorities.pop()
            let priority1 = priorities.pop()
            let priority = this.GetPriority(lexeme)

            if ((priority > priority1) && priority1 > 0)
                arg1 = `(${arg1})`

            if (priority > priority2 && priority2 > 0)
                arg2 = `(${arg2})`

            stack.push(`${arg1} ${lexeme} ${arg2}`)
            priorities.push(this.GetPriority(lexeme))
        }
        else if (this.IsFunction(lexeme)) {
            if (stack.length < 1)
                throw "Unable to evaluate function '" + lexeme + "'"

            let arg = stack.pop()
            let priority = priorities.pop()

            stack.push(`${lexeme}(${arg})`)
            priorities.push(this.GetPriority(lexeme))
        }
        else if (lexeme == NOT) {
            let arg = stack.pop()
            let priority = priorities.pop()

            if (priority > 0)
                arg = `(${arg})`

            stack.push(`¬${arg}`)
            priorities.push(priority)
        }
        else if (this.IsConstant(lexeme)) {
            stack.push(`${this.constants[lexeme]}`)
            priorities.push(this.GetPriority(lexeme))
        }
        else if (this.IsVariable(lexeme)) {
            stack.push(`${lexeme}`)
            priorities.push(this.GetPriority(lexeme))
        }
        else if (this.IsNumber(lexeme)) {
            stack.push(`${lexeme}`)
            priorities.push(this.GetPriority(lexeme))
        }
        else
            throw "Unknown rpn lexeme '" + lexeme + "'"
    }

    return stack[0]
}
