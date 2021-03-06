type Cell = 0 | 1 | 2; // 0: empty; 1: target; 2: blocker
type Grid_Data = Cell[][];
type Position = [number, number];

// each function will return an array with type: Position[]
// gridData is used to locate targets, but king and knight won't use it
type Output = (gridData: Grid_Data, playerPos: Position) => Position[];

const BOARD_SIZE: number = 6;

// return false if the given position is out of the board
function checkOnGrid(pos: Position): boolean{
    if (Math.min(pos[0], pos[1]) < 0) return false; // check min limit
    if (Math.max(pos[0], pos[1]) >= BOARD_SIZE) return false; // check max limit
    return true;
}

function hasBlocker(pos: Position, gridData: Grid_Data): boolean {
    return gridData[pos[1]][pos[0]] === 2;
}

function blockableMoves(
    gridData: Grid_Data, 
    playerPos: Position, 
    allVelocities: [number, number][]
): Position[] {
    const results: Position[] = [];
    allVelocities.forEach((vel: [number, number]) => {
        let nextPos: Position = [playerPos[0] + vel[0], playerPos[1] + vel[1]];
        
        // on grid and has no blocker?
        while (checkOnGrid(nextPos) && !hasBlocker(nextPos, gridData)){
            results.push([nextPos[0], nextPos[1]]); // add pos

            // stop if this nextPos has a target
            if (gridData[nextPos[1]][nextPos[0]] === 1) break;

            nextPos = [nextPos[0] + vel[0], nextPos[1] + vel[1]]; // set next one
        }
    });

    return results;
}

const king: Output = (gridData: Grid_Data, playerPos: Position) => {
    // king can move 1 step in each of the 8 directions | can't be blocked

    const allVelocities: [number, number][] = [
        [0, -1], // up
        [1, -1], // right up
        [1, 0], // right
        [1, 1], // right down
        [0, 1], // down
        [-1, 1], // left down
        [-1, 0], // left
        [-1, -1] // left up
    ];
    
    // map into Positions then filter out the off-grid and blocker ones
    const results: Position[] = allVelocities.map(
        (vel: [number, number]) => {
            const pos: Position = [playerPos[0] + vel[0], playerPos[1] + vel[1]];
            return pos;
        }
    ).filter((pos: Position) => checkOnGrid(pos) && !hasBlocker(pos, gridData));

    return results;
};

const knight: Output = (gridData: Grid_Data, playerPos: Position) => {
    // knight has 8 possible moves | can't be blocked

    const allVelocities: [number, number][] = [
        [2, -1], // 30 (deg)
        [1, -2], // 60
        [-1, -2], // 120
        [-2, -1], // 150
        [-2, 1], // 210
        [-1, 2], // 240
        [1, 2], // 300
        [2, 1] // 330
    ];

    // map into Positions then filter out the off-grid and blocker ones
    const results: Position[] = allVelocities.map(
        (vel: [number, number]) => {
            const pos: Position = [playerPos[0] + vel[0], playerPos[1] + vel[1]];
            return pos;
        }
    ).filter((pos: Position) => checkOnGrid(pos) && !hasBlocker(pos, gridData));

    return results;
};

const bishop: Output = (gridData: Grid_Data, playerPos: Position) => {
    // bishop moves diagonally | can be blocked

    const allVelocities: [number, number][] = [
        [-1, -1], // left up
        [-1, 1], // left down
        [1, 1], // right down
        [1, -1] // right up
    ];

    return blockableMoves(gridData, playerPos, allVelocities);
};

const rook: Output = (gridData: Grid_Data, playerPos: Position) => {
    // rook moves vertically and horizontall | can be blocked

    const allVelocities: [number, number][] = [
        [0, -1], // up
        [0, 1], // down
        [-1, 0], // left
        [1, 0] // right
    ];

    return blockableMoves(gridData, playerPos, allVelocities);
};

const queen: Output = (gridData: Grid_Data, playerPos: Position) => {
    // queen has all moves bishop and rook have | can be blocked
    
    const allVelocities: [number, number][] = [
        [-1, -1], // left up
        [-1, 1], // left down
        [1, 1], // right down
        [1, -1], // right up
        [0, -1], // up
        [0, 1], // down
        [-1, 0], // left
        [1, 0] // right
    ];

    return blockableMoves(gridData, playerPos, allVelocities);
};

const pawn: Output = (gridData: Grid_Data, playerPos: Position) => {
    // pawn can move forward 1 step if there is not target there
    // can move up-diagonally 1 step if there is a target there

    // returns true if this move is allowed
    function allowThisMove(nextPos: Position, captureMove: boolean): boolean {
        if (captureMove) return gridData[nextPos[1]][nextPos[0]] === 1;
        else return gridData[nextPos[1]][nextPos[0]] !== 1;
    }
    
    const results: Position[] = [];
    let nextPos: Position;
    // forward
    nextPos = [playerPos[0], playerPos[1] - 1];
    if (checkOnGrid(nextPos) && allowThisMove(nextPos, false) && !hasBlocker(nextPos, gridData)){
        results.push(nextPos);
    }
    // up left
    nextPos = [playerPos[0] - 1, playerPos[1] - 1];
    if (checkOnGrid(nextPos) && allowThisMove(nextPos, true) && !hasBlocker(nextPos, gridData)){
        results.push(nextPos);
    }
    // up right
    nextPos = [playerPos[0] + 1, playerPos[1] - 1];
    if (checkOnGrid(nextPos) && allowThisMove(nextPos, true) && !hasBlocker(nextPos, gridData)){
        results.push(nextPos);
    }

    return results;
};



export default {king, knight, bishop, rook, queen, pawn}