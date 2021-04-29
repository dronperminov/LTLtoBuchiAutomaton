function LTLExpression(expression) {
    this.parser = new LTLParser(expression)
    this.variables = this.parser.variables
    this.inputExpression = expression
    this.parsedExpression = this.parser.ToStringRPN(this.parser.rpn)
    this.tree = this.MakeTree(this.parser.rpn)
    this.expression = this.ToString(this.tree)
}

// проверка двух деревьев на эквивалентность
LTLExpression.prototype.IsTreesEqual = function(node1, node2) {
    if (node1 == null && node2 == null)
        return true

    if (node1 == null || node2 == null)
        return false

    if (node1.value != node2.value)
        return false

    return this.IsTreesEqual(node1.arg1, node2.arg1) && this.IsTreesEqual(node1.arg2, node2.arg2)
}

// проверка на эквивалентность
LTLExpression.prototype.IsEqual = function(expression) {
    return this.IsTreesEqual(this.tree, expression.tree)
}

// проверка на обратную эквивалентность
LTLExpression.prototype.IsInverse = function(expression) {
    if (this.IsTreesEqual(this.tree, this.MakeNode(NOT, expression.tree)))
        return true

    if (this.IsTreesEqual(this.MakeNode(NOT, this.tree), expression.tree))
        return true

    return false
}

// формирование узла дерева
LTLExpression.prototype.MakeNode = function(value, arg1 = null, arg2 = null) {
    return {value: value, arg1: arg1, arg2: arg2}
}

// упрощение дерева для оператора X
LTLExpression.prototype.SimplifyTreeNext = function(node) {
    if (node.arg1.value == NOT)
        return this.MakeNode(NOT, this.MakeNode(NEXT, node.arg1.arg1))

    if ([AND, OR, XOR, EQUAL, SHEFFER, PIRS, UNTIL].indexOf(node.arg1.value) > -1) {
        let arg1 = this.SimplifyTree(this.MakeNode(NEXT, node.arg1.arg1))
        let arg2 = this.SimplifyTree(this.MakeNode(NEXT, node.arg1.arg2))
        return this.MakeNode(node.arg1.value, arg1, arg2)
    }

    if (node.arg1.value == IMPL) {
        let arg1 = this.SimplifyTree(this.MakeNode(NOT, this.MakeNode(NEXT, node.arg1.arg1)))
        let arg2 = this.SimplifyTree(this.MakeNode(NEXT, node.arg1.arg2))
        return this.MakeNode(OR, arg1, arg2)
    }

    if (node.arg1.value == ONE || node.arg1.value == ZERO)
        return this.MakeNode(node.arg1.value)

    return node
}

// упрощение дереа для темпоральных операторов
LTLExpression.prototype.SimplifyTemporal = function(node) {
    if (node.value == GLOBALLY)
        node = this.SimplifyTree(this.MakeNode(NOT, this.MakeNode(UNTIL, this.MakeNode(ONE), this.MakeNode(NOT, node.arg1))))

    if (node.value == FUTURE)
        node = this.SimplifyTree(this.MakeNode(UNTIL, this.MakeNode(ONE), node.arg1))

    return node
}

LTLExpression.prototype.SimplifyTemporalOperator = function(node) {
    if (node.value == RELEASE)
        return this.SimplifyTree(this.MakeNode(NOT, this.MakeNode(UNTIL, this.MakeNode(NOT, node.arg1), this.MakeNode(NOT, node.arg2))))

    if (node.value == WEAK_UNTIL)
        return this.SimplifyTree(this.MakeNode(OR, this.MakeNode(UNTIL, node.arg1, node.arg2), this.MakeNode(GLOBALLY, node.arg1)))

    return node
}

// упрощение дерева для отрицания
LTLExpression.prototype.SimplifyTreeNot = function(node) {
    if (node.arg1.value == ONE )
        return this.MakeNode(ZERO)

    if (node.arg1.value == ZERO )
        return this.MakeNode(ONE)

    if (node.arg1.value == NOT)
        return node.arg1.arg1

    if (node.arg1.value == XOR)
        return this.MakeNode(EQUAL, node.arg1.arg1, node.arg1.arg2)

    if (node.arg1.value == EQUAL)
        return this.MakeNode(XOR, node.arg1.arg1, node.arg1.arg2)

    if (node.arg1.value == PIRS)
        return this.MakeNode(OR, node.arg1.arg1, node.arg1.arg2)

    if (node.arg1.value == SHEFFER)
        return this.MakeNode(AND, node.arg1.arg1, node.arg1.arg2)

    if (node.arg1.value == IMPL) {
        return this.MakeNode(AND, node.arg1.arg1, this.MakeNode(NOT, node.arg1.arg2))
    }

    return node
}

// упрощение дерева для конъюнкции
LTLExpression.prototype.SimplifyTreeAnd = function(node) {
    if (node.arg1.value == ZERO || node.arg2.value == ZERO)
        return this.MakeNode(ZERO)

    if (node.arg1.value == ONE)
        return node.arg2

    if (node.arg2.value == ONE)
        return node.arg1

    if (this.IsTreesEqual(node.arg1, node.arg2))
        return node.arg1

    if (this.IsTreesEqual(node.arg1, this.MakeNode(NOT, node.arg2)))
        return this.MakeNode(ZERO)

    if (node.arg2.value == OR && (this.IsTreesEqual(node.arg1, node.arg2.arg1) || this.IsTreesEqual(node.arg1, node.arg2.arg2)))
        return node.arg1

    if (node.arg1.value == OR && (this.IsTreesEqual(node.arg2, node.arg1.arg1) || this.IsTreesEqual(node.arg2, node.arg1.arg2)))
        return node.arg2

    return node
}

// упрощение дерева для дизъюнкции
LTLExpression.prototype.SimplifyTreeOr = function(node) {
    if (node.arg1.value == ONE || node.arg2.value == ONE)
        return this.MakeNode(ONE)

    if (node.arg1.value == ZERO)
        return node.arg2

    if (node.arg2.value == ZERO)
        return node.arg1

    if (this.IsTreesEqual(node.arg1, node.arg2))
        return node.arg1

    if (this.IsTreesEqual(node.arg1, this.MakeNode(NOT, node.arg2)))
        return this.MakeNode(ONE)

    if (node.arg2.value == AND && (this.IsTreesEqual(node.arg1, node.arg2.arg1) || this.IsTreesEqual(node.arg1, node.arg2.arg2)))
        return node.arg1

    if (node.arg1.value == AND && (this.IsTreesEqual(node.arg2, node.arg1.arg1) || this.IsTreesEqual(node.arg2, node.arg1.arg2)))
        return node.arg2

    return node
}

// упрощение дерева для исключающего или
LTLExpression.prototype.SimplifyTreeXor = function(node) {
    if (node.arg1.value == ZERO)
        return node.arg2

    if (node.arg2.value == ZERO)
        return node.arg1

    if (node.arg1.value == ONE && node.arg2.value == ONE)
        return this.MakeNode(ZERO)

    if (node.arg1.value == ONE)
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg2))

    if (node.arg2.value == ONE)
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg1))

    if (this.IsTreesEqual(node.arg1, node.arg2))
        return this.MakeNode(ZERO)

    if (this.IsTreesEqual(node.arg1, this.MakeNode(NOT, node.arg2)))
        return this.MakeNode(ONE)

    return node
}

// упрощение дерева для штриха Шеффера
LTLExpression.prototype.SimplifyTreeSheffer = function(node) {
    if (node.arg1.value == ZERO || node.arg2.value == ZERO)
        return this.MakeNode(ONE)

    if (node.arg1.value == ONE && node.arg2.value == ONE)
        return this.MakeNode(ZERO)

    if (node.arg1.value == ONE)
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg2))

    if (node.arg2.value == ONE)
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg1))

    if (this.IsTreesEqual(node.arg1, node.arg2))
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg1))

    return node
}

// упрощение дерева для стрелки Пирса
LTLExpression.prototype.SimplifyTreePirs = function(node) {
    if (node.arg1.value == ONE || node.arg2.value == ONE)
        return this.MakeNode(ZERO)

    if (node.arg1.value == ZERO && node.arg2.value == ZERO)
        return this.MakeNode(ONE)

    if (node.arg1.value == ZERO)
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg2))

    if (node.arg2.value == ZERO)
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg1))

    if (this.IsTreesEqual(node.arg1, node.arg2))
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg1))

    return node
}

// упрощение дерева для импликации
LTLExpression.prototype.SimplifyTreeImpl = function(node) {
    if (node.arg1.value == ZERO || node.arg2.value == ONE)
        return this.MakeNode(ONE)

    if (node.arg1.value == ONE)
        return node.arg2

    if (node.arg2.value == ZERO)
        return this.SimplifyTreeNot(this.MakeNode(NOT, node.arg1))

    if (this.IsTreesEqual(node.arg1, node.arg2))
        return this.MakeNode(ONE)

    return node
}

// упрощение дерева для эквивалентности
LTLExpression.prototype.SimplifyTreeEqual = function(node) {
    if (node.arg1.value == ONE && node.arg2.value == ONE)
        return this.MakeNode(ONE)

    if (node.arg1.value == ZERO && node.arg2.value == ZERO)
        return this.MakeNode(ONE)

    if (this.IsTreesEqual(node.arg1, node.arg2))
        return this.MakeNode(ONE)

    return node
}

// упрощение дерева
LTLExpression.prototype.SimplifyTree = function(node) {
    if (node == null)
        return node

    // упрощаем всё уровнями ниже
    node.arg1 = this.SimplifyTree(node.arg1)
    node.arg2 = this.SimplifyTree(node.arg2)

    if (node.value == NOT)
        return this.SimplifyTreeNot(node)

    if (node.value == NEXT)
        return this.SimplifyTreeNext(node)

    if (node.value == GLOBALLY || node.value == FUTURE)
        return this.SimplifyTemporal(node)

    if (!this.parser.IsOperator(node.value)) // если не оператор
        return node // то не упрощаем

    if (node.value == RELEASE || node.value == WEAK_UNTIL)
        return this.SimplifyTemporalOperator(node)

    if (node.value == AND)
        return this.SimplifyTreeAnd(node)

    if (node.value == OR)
        return this.SimplifyTreeOr(node)

    if (node.value == XOR)
        return this.SimplifyTreeXor(node)

    if (node.value == SHEFFER)
        return this.SimplifyTreeSheffer(node)

    if (node.value == PIRS)
        return this.SimplifyTreePirs(node)

    if (node.value == IMPL)
        return this.SimplifyTreeImpl(node)

    if (node.value == EQUAL)
        return this.SimplifyTreeEqual(node)

    return node
}

// формирование дерева выражения по польской записи
LTLExpression.prototype.MakeTree = function(rpn) {
    let tree = null
    let stack = []

    for (let lexeme of rpn.values()) {
        if (this.parser.IsOperator(lexeme)) {
            let arg2 = stack.pop()
            let arg1 = stack.pop()
            stack.push(this.MakeNode(lexeme, arg1, arg2))
        }
        else if (this.parser.IsFunction(lexeme)) {
            stack.push(this.MakeNode(lexeme, stack.pop()))
        }
        else if (lexeme == NOT) {
            stack.push(this.MakeNode(lexeme, stack.pop()))
        }
        else if (this.parser.IsConstant(lexeme) || this.parser.IsVariable(lexeme) || this.parser.IsNumber(lexeme)) {
            stack.push(this.MakeNode(lexeme))
        }
        else
            throw "Unknown rpn lexeme '" + lexeme + "'"
    }

    return this.SimplifyTree(stack[0])
}

// перевод из дерева в польскую запись
LTLExpression.prototype.TreeToRpnRecursive = function(node, rpn) {
    if (node == null)
        return

    this.TreeToRpnRecursive(node.arg1, rpn)
    this.TreeToRpnRecursive(node.arg2, rpn)
    rpn.push(node.value)
}

// перевод из дерева в польскую запись
LTLExpression.prototype.TreeToRpn = function(tree) {
    let rpn = []
    this.TreeToRpnRecursive(tree, rpn)
    return rpn
}

// перевод выражения в строку
LTLExpression.prototype.ToString = function(tree) {
    let rpn = this.TreeToRpn(tree)
    return this.parser.ToStringRPN(rpn)
}

// вычисление на дереве
LTLExpression.prototype.EvaluateTree = function(node, variables) {
    if (this.parser.IsNumber(node.value))
        return +node.value

    if (this.parser.IsConstant(node.value))
        return this.parser.constants[node.value]

    if (this.parser.IsVariable(node.value))
        return variables[node.value]

    if (this.parser.IsOperator(node.value)) {
        let arg1 = this.EvaluateTree(node.arg1, variables)
        let arg2 = this.EvaluateTree(node.arg2, variables)
        return this.parser.operators[node.value](arg1, arg2)
    }

    if (node.value == NOT)
        return 1 - this.EvaluateTree(node.arg1, variables)

    throw node
}

LTLExpression.prototype.Evaluate = function() {
    return this.EvaluateTree(this.tree, this.variables)
}

/****************************************************************************/
LTLExpression.prototype.GetAllSubTreesRecursive = function(node, positive, negative) {
    if (node == null)
        return

    this.GetAllSubTreesRecursive(node.arg1, positive, negative)
    this.GetAllSubTreesRecursive(node.arg2, positive, negative)

    if (node.value != NOT) {
        positive.add(this.ToString(node))
        negative.add(this.ToString(this.SimplifyTree(this.MakeNode(NOT, node))))
    }
}

// получение всех подвыражений (с отрицаниями и без)
LTLExpression.prototype.GetAllSubTrees = function(tree) {
    let positive = new Set()
    let negative = new Set()
    this.GetAllSubTreesRecursive(this.tree, positive, negative)

    let positiveExpressions = []
    let negativeExpressions = []

    for (let expression of positive.values())
        positiveExpressions.push(new LTLExpression(expression))

    for (let expression of negative.values())
        negativeExpressions.push(new LTLExpression(expression))

    return { positive: positiveExpressions, negative: negativeExpressions }
}

// является ли узел атомом
LTLExpression.prototype.IsAtomNode = function(node) {
    if (this.parser.IsVariable(node.value) && node.arg1 == null && node.arg2 == null)
        return true

    return node.value == NEXT && this.IsAtomNode(node.arg1)
}

// является ли выражение атомом
LTLExpression.prototype.IsAtom = function() {
    return this.IsAtomNode(this.tree)
}

// является ли выражение оператцией
LTLExpression.prototype.IsOperator = function() {
    return this.parser.IsOperator(this.tree.value)
}

// является ли выражение переменной
LTLExpression.prototype.IsVariable = function() {
    return this.parser.IsVariable(this.tree.value) && this.tree.arg1 == null && this.tree.arg2 == null
}

// получение размера поддереа
LTLExpression.prototype.GetSizeNode = function(node) {
    if (node == null)
        return 0

    return 1 + this.GetSizeNode(node.arg1) + this.GetSizeNode(node.arg2)
}

// получение размеа дерева
LTLExpression.prototype.GetSize = function() {
    return this.GetSizeNode(this.tree)
}

// есть ли в выражении UNTIL
LTLExpression.prototype.HaveUntilNode = function(node) {
    if (node == null)
        return false

    if (node.value == UNTIL)
        return true

    return this.HaveUntilNode(node.arg1) || this.HaveUntilNode(node.arg2)
}

// есть ли в выражении UNTIL
LTLExpression.prototype.HaveUntil = function() {
    return this.HaveUntilNode(this.tree)
}

// разбиение по UNTIL
LTLExpression.prototype.SplitByUntil = function() {
    if (this.tree.value != UNTIL)
        throw this.tree // TODO

    let xi = new LTLExpression(this.ToString(this.tree.arg1))
    let psi = new LTLExpression(this.ToString(this.tree.arg2))

    return { xi: xi, psi: psi }
}

// разбиение по операции
LTLExpression.prototype.SplitByOperation = function() {
    let arg1 = new LTLExpression(this.ToString(this.tree.arg1))
    let arg2 = new LTLExpression(this.ToString(this.tree.arg2))

    return { arg1: arg1, arg2: arg2 }
}

// получение аргумента X
LTLExpression.prototype.GetNextArgument = function() {
    if (this.tree.value != NEXT)
        throw "NOT NEXT TREE"

    return new LTLExpression(this.ToString(this.tree.arg1))
}

// замена атомного элемента
LTLExpression.prototype.ReplaceAtomRule = function(node, rules) {
    for (let i = 0; i < rules.length; i++)
        if (this.IsTreesEqual(node, rules[i][0].tree))
            return this.MakeNode(rules[i][1])

    throw node
}

// формирование дерева с выполненными заменами
LTLExpression.prototype.MakeSubstitutionTree = function(node, atomsRules) {
    if (node == null)
        return null

    if (this.IsAtomNode(node))
        return this.ReplaceAtomRule(node, atomsRules)

    let value = node.value
    let arg1 = this.MakeSubstitutionTree(node.arg1, atomsRules)
    let arg2 = this.MakeSubstitutionTree(node.arg2, atomsRules)

    return this.MakeNode(value, arg1, arg2)
}

// формирование дерева с выполненными заменами
LTLExpression.prototype.GetSubstitutionTree = function(atomsRules) {
    return this.MakeSubstitutionTree(this.tree, atomsRules)
}