function BuchiDrawer(canvas, width, height, states, transitions, initialStates, finalStates) {
    this.canvas = canvas
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')

    let calculator = this
    this.canvas.addEventListener('mousedown', function(e) { calculator.MouseDown(e) })
    this.canvas.addEventListener('mouseup', function(e) { calculator.MouseUp(e) })
    this.canvas.addEventListener('mousemove', function(e) { calculator.MouseMove(e) })

    this.states = states
    this.transitions = transitions
    this.initialStates = initialStates
    this.finalStates = finalStates
    this.nodes = this.InitNodes()
}

BuchiDrawer.prototype.InitNodes = function() {
    let nodes = []

    let radius = Math.min(this.width, this.height) / 2 - 50
    let x0 = this.width / 2
    let y0 = this.height / 2
    let phi = Math.PI * 2 / this.states.length

    for (let i = 0; i < this.states.length; i++) {
        let x = x0 + radius * Math.cos(i * phi)
        let y = y0 + radius * Math.sin(i * phi)

        nodes.push({ x: x, y: y, name: "s" + (i + 1), isFinal: this.finalStates.indexOf(i + 1) > -1, isInit: this.initialStates.indexOf(i + 1) > -1, alpha: i * phi })
    }

    return nodes
}

BuchiDrawer.prototype.DrawArrow = function(x1, y1, x2, y2, size = 15, alpha = 0.3) {
    let dx = x2 - x1
    let dy = y2 - y1
    let phi = Math.atan2(dy, dx)

    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = '#000'
    this.ctx.fillStyle = '#000'
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.moveTo(x2, y2)
    this.ctx.lineTo(x2 - size * Math.cos(alpha - phi), y2 + size * Math.sin(alpha - phi))
    this.ctx.lineTo(x2 - size * Math.cos(-alpha - phi), y2 + size * Math.sin(-alpha - phi))
    this.ctx.lineTo(x2, y2)
    this.ctx.fill()
}

BuchiDrawer.prototype.DrawTransitions = function(radius) {
    for (let i = 0; i < this.transitions.length; i++) {
        for (let j = 0; j < this.transitions[i].states.length; j++) {
            let node1 = this.nodes[i]
            let node2 = this.nodes[this.transitions[i].states[j] - 1]

            let x1 = node1.x - radius * Math.cos(node1.alpha)
            let y1 = node1.y - radius * Math.sin(node1.alpha)
            let x2 = node2.x - radius * Math.cos(node2.alpha)
            let y2 = node2.y - radius * Math.sin(node2.alpha)

            this.DrawArrow(x1, y1, x2, y2)
        }
    }
}

BuchiDrawer.prototype.DrawNodes = function(radius) {
    for (let i = 0; i < this.nodes.length; i++) {
        let node = this.nodes[i]

        if (node.isInit) {
            let x1 = node.x + 2 * radius * Math.cos(node.alpha)
            let x2 = node.x + radius * Math.cos(node.alpha)
            let y1 = node.y + 2 * radius * Math.sin(node.alpha)
            let y2 = node.y + radius * Math.sin(node.alpha)

            this.DrawArrow(x1, y1, x2, y2)
        }

        this.ctx.fillStyle = '#fff'
        this.ctx.lineWidth = node.isFinal ? 4 : 1

        this.ctx.beginPath()
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2, 20)
        // this.ctx.fill()
        this.ctx.stroke()

        this.ctx.fillStyle = '#000'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.font = '18px Consolas'
        this.ctx.fillText(node.name, node.x, node.y)
    }
}

BuchiDrawer.prototype.Draw = function() {
    this.ctx.clearRect(0, 0, this.width, this.height)

    let radius = 25

    this.DrawTransitions(radius)
    this.DrawNodes(radius)
}

BuchiDrawer.prototype.MouseDown = function(e) {

}

BuchiDrawer.prototype.MouseUp = function(e) {
    
}

BuchiDrawer.prototype.MouseMove = function(e) {
    this.Draw()
}