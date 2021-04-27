function BuchiDrawer(canvas, width, height, states, transitions, initialStates, finalStates) {
    this.canvas = canvas
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')

    this.x0 = this.width / 2
    this.y0 = this.height / 2

    let calculator = this
    this.canvas.addEventListener('mousedown', function(e) { calculator.MouseDown(e) })
    this.canvas.addEventListener('mouseup', function(e) { calculator.MouseUp(e) })
    this.canvas.addEventListener('mousemove', function(e) { calculator.MouseMove(e) })

    this.states = states
    this.transitions = transitions
    this.initialStates = initialStates
    this.finalStates = finalStates
    this.nodes = this.InitNodes()
    this.prevX = -1
    this.prevY = -1
    this.activeNode = null
    this.isPressed = false
}

BuchiDrawer.prototype.InitNodes = function() {
    let nodes = []

    let radius = Math.min(this.width, this.height) / 2 - 50
    let phi = Math.PI * 2 / this.states.length

    for (let i = 0; i < this.states.length; i++) {
        let x = this.x0 + radius * Math.cos(i * phi)
        let y = this.y0 + radius * Math.sin(i * phi)
        let name = "s" + (i + 1)
        let isFinal = []

        for (let j = 0; j < this.finalStates.length; j++)
            if (this.finalStates[j].indexOf(i + 1) > -1)
                isFinal.push("F" + (j + 1))

        let isInit = this.initialStates.indexOf(i + 1) > -1
        let alpha = i * phi
        let nodeRadius = 25

        nodes.push({ x: x, y: y, name: name, isFinal: isFinal, isInit: isInit, alpha: alpha, radius: nodeRadius })
    }

    return nodes
}

BuchiDrawer.prototype.DrawArrow = function(x1, y1, x2, y2, color = '#000', isBezier = true) {
    let dx = x2 - x1
    let dy = y2 - y1
    let phi = Math.atan2(dy, dx)
    let size = 15
    let alpha = 0.3

    let d = 25
    let x = x1 + dx / 2 + d * Math.sin(phi)
    let y = y1 + dy / 2 + d * Math.cos(phi)

    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = color
    this.ctx.fillStyle = color

    this.ctx.beginPath()

    if (isBezier) {
        this.ctx.bezierCurveTo(x1, y1, x, y, x2, y2)
    }
    else {
        this.ctx.moveTo(x1, y1)
        this.ctx.lineTo(x2, y2)
    }

    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.moveTo(x2, y2)
    this.ctx.lineTo(x2 - size * Math.cos(alpha - phi), y2 + size * Math.sin(alpha - phi))
    this.ctx.lineTo(x2 - size * Math.cos(-alpha - phi), y2 + size * Math.sin(-alpha - phi))
    this.ctx.lineTo(x2, y2)
    this.ctx.fill()
}

BuchiDrawer.prototype.DrawTransitions = function() {
    for (let i = 0; i < this.transitions.length; i++) {
        for (let j = 0; j < this.transitions[i].states.length; j++) {
            let node1 = this.nodes[i]
            let node2 = this.nodes[this.transitions[i].states[j] - 1]

            let color = '#000'

            if (node1 == this.activeNode) {
                color = '#f00'
            }
            else if (node2 == this.activeNode) {
                color = '#00f'
            }

            if (node1 == node2) {
                this.ctx.lineWidth = 1
                this.ctx.strokeStyle = color
                this.ctx.fillStyle = color
                this.ctx.beginPath()
                this.ctx.arc(node1.x + node1.radius * Math.cos(node1.alpha), node1.y + node1.radius * Math.sin(node1.alpha), node1.radius * 1.2, 0, Math.PI * 2)
                this.ctx.stroke()
            }
            else {
                let x1 = node1.x - node1.radius * Math.cos(node1.alpha)
                let y1 = node1.y - node1.radius * Math.sin(node1.alpha)
                let x2 = node2.x - node2.radius * Math.cos(node2.alpha)
                let y2 = node2.y - node2.radius * Math.sin(node2.alpha)

                this.DrawArrow(x1, y1, x2, y2, color)
            }
        }
    }
}

BuchiDrawer.prototype.DrawNodes = function() {
    for (let i = 0; i < this.nodes.length; i++) {
        let node = this.nodes[i]

        if (node.isInit) {
            let x1 = node.x + 2 * node.radius * Math.cos(node.alpha)
            let x2 = node.x + node.radius * Math.cos(node.alpha)
            let y1 = node.y + 2 * node.radius * Math.sin(node.alpha)
            let y2 = node.y + node.radius * Math.sin(node.alpha)

            this.DrawArrow(x1, y1, x2, y2, '#000', false)
        }

        this.ctx.fillStyle = '#fff'
        this.ctx.strokeStyle = '#000'
        this.ctx.lineWidth = node.isFinal.length > 0 ? 4 : 1

        this.ctx.beginPath()
        this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2, 20)
        this.ctx.fill()
        this.ctx.stroke()

        this.ctx.fillStyle = '#000'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.font = '18px Consolas'

        if (node.isFinal.length > 0) {
            this.ctx.fillText(node.name, node.x, node.y - 8)
            this.ctx.font = '12px Consolas'
            this.ctx.fillText(node.isFinal.join(","), node.x, node.y + 8)
        }
        else {
            this.ctx.fillText(node.name, node.x, node.y)
        }
    }
}

BuchiDrawer.prototype.Draw = function() {
    this.ctx.clearRect(0, 0, this.width, this.height)

    this.DrawTransitions()
    this.DrawNodes()
}

BuchiDrawer.prototype.GetNodeAt = function(x, y) {
    for (let i = 0; i < this.nodes.length; i++) {
        let dx = this.nodes[i].x - x
        let dy = this.nodes[i].y - y
        let radius = this.nodes[i].radius

        if (dx*dx + dy*dy < radius * radius)
            return this.nodes[i]
    }

    return null
}

BuchiDrawer.prototype.MouseDown = function(e) {
    this.activeNode = this.GetNodeAt(e.offsetX, e.offsetY)
    this.isPressed = true
    this.prevX = e.offsetX
    this.prevY = e.offsetY
    this.Draw()
}

BuchiDrawer.prototype.MouseUp = function(e) {
    this.isPressed = false
}

BuchiDrawer.prototype.MouseMove = function(e) {
    this.canvas.style.cursor = this.GetNodeAt(e.offsetX, e.offsetY) == null ? 'default' : 'pointer'

    if (!this.isPressed || this.activeNode == null)
        return

    this.activeNode.x += e.offsetX - this.prevX
    this.activeNode.y += e.offsetY - this.prevY
    this.activeNode.alpha = Math.atan2(this.activeNode.y - this.y0, this.activeNode.x - this.x0)

    this.prevX = e.offsetX
    this.prevY = e.offsetY
    this.Draw()
}