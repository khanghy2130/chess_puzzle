import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';

import "./style.scss";
import LevelObject from '../../../server/Level_Object';
import RoomObject from '../../../server/Room_Object';
import cmMoves from './Chessman_Moves';

import img_king from './chess_pieces/king.svg';
import img_queen from './chess_pieces/queen.svg';
import img_pawn from './chess_pieces/pawn.svg';
import img_bishop from './chess_pieces/bishop.svg';
import img_knight from './chess_pieces/knight.svg';
import img_rook from './chess_pieces/rook.svg';
import img_target from './chess_pieces/target.svg';
import img_unselected from './chess_pieces/unselected.svg';
import img_blocker from './chess_pieces/blocker.svg';


interface propObject {
    socket: any,
    levelObject: LevelObject,
    resetRoomPage: (receivedLevelObject: RoomObject) => void,
    roomID: string,
    nickname: string
};

type Cell = 0 | 1 | 2; // 0: empty; 1: target; 2: blocker
type Chessman = "pawn" | "rook" | "bishop" | "knight" | "queen" | "king";

// [chessman type, availability]
type ChessmanPlay = [Chessman, boolean];
// [x, y]
type Position = [number, number];
// [previous position, used-chessman index, just captured a target?]
type MoveHistory = [Position, number, boolean]; 


const Play_Page = ({socket, levelObject, resetRoomPage, roomID, nickname} : propObject) => {
    const time_display = useRef<HTMLHeadingElement>(null);
    // store timeLeft as ref
    const timeLeft = useRef<any>({ value: levelObject.timeLimit });
    const [timeLimitIntervalID, setTimeLimitIntervalID] = useState<any>(null); // ID of the time limit countdown interval

    // begin countdown 
    const begin_countdown_display = useRef<HTMLHeadingElement>(null);
    let beginCountdownIntervalID: any; // ID of the begin countdown interval

    // main game state status
    const [progress, setProgress] = useState<"preparing"|"playing"|"incomplete"|"complete">("preparing");
    
    // dictionary for image sources
    const cmImg: {[key: string]: string} = {
        "king": img_king,
        "queen": img_queen,
        "pawn": img_pawn,
        "bishop": img_bishop,
        "knight": img_knight,
        "rook": img_rook,
        "target": img_target,
        "unselected": img_unselected,
        "blocker": img_blocker
    };

    // -- Control States --
    // gridData: 2d array containing each Cell data
    const [gridData, setGridData] = useState<Cell[][]>([[1]]); // dummy value to fail checkWin()
    // playerPos: player's piece position
    const [playerPos, setPlayerPos] = useState<Position>([0, 0]); // dummy value
    // chessman List: list of chessman those which player will use
    const [cmList, setCmList] = useState<ChessmanPlay[]>([]);
    // moveHistories: record player moves to reverse
    const [moveHistories, setMoveHistories] = useState<MoveHistory[]>([]);
    // selected Chessman: index of the selected chessman in cmList, null means unselected
    const [selectedCm, setSelectedCm] = useState<number | null>(null);
    // movableTiles: array of cell positions that the selected chessman can move to
    const [movableTiles, setMovableTiles] = useState<Position[]>([]);

    // socket io events
    useEffect(()=>{
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0); // scroll to top when play page loaded

            socket.on("end-game", (receivedRoomObject : RoomObject) => {
                resetRoomPage(receivedRoomObject);
            });
        }

        return () => {
            socket.off("end-game");
        }
    // eslint-disable-next-line
    }, []);

    // progress status handler
    useLayoutEffect(()=>{
        console.log("Just changed: " , progress);
        // after begin countdown is done
        if (progress === "preparing"){
            // initiate begin-countdown
            let beginCountdownLeft = 3;
            beginCountdownIntervalID = setInterval(()=>{
                if (beginCountdownLeft > 0){
                    beginCountdownLeft--; // decrease the timeLimit
                    if (begin_countdown_display && begin_countdown_display.current){
                        begin_countdown_display.current.innerText = "" + beginCountdownLeft;
                    }
                } else {
                    window.clearInterval(beginCountdownIntervalID); // stop begin countdown
                    setProgress("playing");
                }
            }, 800);

            loadLevel();
        }
        else if (progress === "playing"){
            // start the time limit countdown
            setTimeLimitIntervalID(setInterval(()=>{
                if (timeLeft.current.value > 0){
                    timeLeft.current.value--;
                    if (time_display && time_display.current){
                        time_display.current.innerText = timeLeft.current.value;
                    }
                } else {
                    setProgress("incomplete");
                }
            }, 1000));
        }
        // after puzzle is solved
        else if (progress === "complete"){
            socket.emit("play-report", roomID, levelObject.timeLimit - timeLeft.current.value);
        }
        // after time limit countdown is done
        else if (progress === "incomplete"){
            window.clearInterval(timeLimitIntervalID); // stop countdown interval
            socket.emit("play-report", roomID, null);
        }

        return () => {
            window.clearInterval(beginCountdownIntervalID); // stop countdown
            window.clearInterval(timeLimitIntervalID); // stop countdown
        }
    // eslint-disable-next-line
    }, [progress]);

    // check win whenever gridData changes
    useEffect(() => {
        if (!gridData.flat(1).includes(1)){
            setProgress("complete");
        }
    }, [gridData]);

    // called when play page starts
    function loadLevel(): void{
        // load game states (gridData, playerPos, cmList)
        // gridData
        setGridData(levelObject.gridData);

        // playerPos
        setPlayerPos(levelObject.playerPos);

        // cmList
        setCmList(levelObject.chessmanList.map((cm: Chessman) => [cm, true]));
        // resetting moveHistories, selectedCm, and movableTiles 
        setMoveHistories([]);
        setSelectedCm(null);
        setMovableTiles([]);
    }

    // update selectedCm and movableTiles
    function chessmanClicked(cmPlay: ChessmanPlay, index: number): void{
        // do nothing if this chessman is used, or is already selected
        if (!cmPlay[1] || selectedCm === index) return;

        setSelectedCm(index); // selected!

        // find and set movableTiles
        setMovableTiles(cmMoves[cmPlay[0]](gridData, playerPos));
    }

    function cellClicked(x: number, y: number){
        // the loop for for checking if the cell is a movable cell
        for (let i=0; i < movableTiles.length; i++){
            const movableCell: Position = movableTiles[i];
            if (movableCell[0] === x && movableCell[1] === y){
                // push new move history
                const newMoveHistory: MoveHistory = [
                    playerPos,
                    selectedCm || 0, // selectedCm wouldn't be null right here
                    gridData[y][x] === 1
                ];
                setMoveHistories([...moveHistories, newMoveHistory]);

                // update gridData on prev pos
                setGridData(gridData.map((row: Cell[], yIndex: number) => {
                    if (yIndex !== y) return row;
                    return row.map((cellData: Cell, xIndex: number) => {
                        if (xIndex !== x) return cellData;
                        return 0; // set the target cell to empty
                    });
                }));

                // update cmList on selected cm
                setCmList(cmList.map((cmPlay: ChessmanPlay, index: number) => {
                    if (index === selectedCm){
                        return [cmPlay[0], false];
                    }
                    else return cmPlay;
                }));
                
                setPlayerPos(movableCell); // set new playerPos
                setSelectedCm(null); // reset selectedCm
                setMovableTiles([]); // reset movableTiles
                
                return;
            }
        }
    }

    function undoClicked(): void {
        const previousMove: MoveHistory = moveHistories[moveHistories.length - 1];

        // set gridData (if was a capturing move)
        if (previousMove[2]){
            setGridData(gridData.map((row: Cell[], yIndex: number) => {
                if (yIndex !== playerPos[1]) return row;
                return row.map((cellData: Cell, xIndex: number) => {
                    if (xIndex !== playerPos[0]) return cellData;
                    return 1; // give back to target cell
                });
            }));
        }

        // set cmList
        setCmList(cmList.map((cmPlay: ChessmanPlay, index: number) => {
            if (index === previousMove[1]){
                return [cmPlay[0], true];
            }
            else return cmPlay;
        }));

        // set moveHistories
        setMoveHistories(moveHistories.filter(move => move !== previousMove));
        
        setPlayerPos(previousMove[0]); // set playerPos
        setSelectedCm(null); // set selectedCm
        setMovableTiles([]); // reset movableTiles
    }

    function renderCell(x: number, y: number){
        function isMovable(){
            for (let i=0; i < movableTiles.length; i++){
                const pos: Position = movableTiles[i];
                if (pos[0] === x && pos[1] === y) return true;
            }
            return false;
        }

        return (<div 
            onClick={() => cellClicked(x, y)}
            className={(isMovable())? "movable" : ""}>
            {
                // is a target cell? : is a blocker? : is the player? : empty cell
                (gridData[y][x] === 1) ? (
                    <img src={cmImg["target"]} alt="target cell" />
                ) : (gridData[y][x] === 2) ? (
                    <img src={cmImg["blocker"]} alt="blocker cell" />
                )
                : (playerPos[0] === x && playerPos[1] === y) ? (
                    // key provided to replay css popup animation
                    <img alt="player cell"
                    className="player-cell" 
                    key={"player: " + selectedCm}
                    src={
                        // is unselected? : not selected
                        (selectedCm === null) ? cmImg["unselected"]
                        : cmImg[cmList[selectedCm][0]]
                    } />
                ) : null
            }
        </div>);
    }

    return (
        <main id="play-page-main">
            
            <div id="table-wrapper">
                <table><tbody>
                    {gridData.map((row: Cell[], y: number) => (
                        <tr key={"row:" + y}>{
                            row.map((cellData: Cell, x: number) => (
                                <td key={"cell: " + x}>
                                    {renderCell(x, y)}
                                </td>
                            ))
                        }</tr>
                    ))}
                </tbody></table>

                <h3>Time left: &nbsp;<span ref={time_display}>{timeLeft.current.value}</span> seconds</h3>
                <div id="buttons-div">
                    <button 
                    onClick={loadLevel} 
                    disabled={moveHistories.length === 0}>
                        Reset
                    </button>
                    <button
                    onClick={undoClicked}
                    disabled={moveHistories.length === 0}>
                        Undo
                    </button>
                </div>
            </div>

            <div id="chessman-container">
                {(cmList.map((cmPlay: ChessmanPlay, index: number) => <button 
                key={index} 
                disabled={!cmPlay[1]}
                onClick={() => chessmanClicked(cmPlay, index)}
                className={
                    // selected class
                    (selectedCm === index) ? "selected" :
                    // unselected state & unused
                    (selectedCm === null && cmPlay[1]) ? "blink" : ""
                }
                style={{animationDelay:`${index * 0.5}s`}}>
                    <img src={cmImg[cmPlay[0]]} alt="chessman" />
                </button>))}
            </div>

            {(progress === "playing") ? null : (
                <div id="play-page-modal">
                    {
                        (progress === "preparing") ? (<div>
                            <h3>Capture all <span className="red-color">targets</span>!</h3>
                            <h2>Starting in...</h2>
                            <h2 className="blue-color" ref={begin_countdown_display}>3</h2>
                        </div>) :
                        (progress === "complete") ? (<div>
                            <h2 className="blue-color">Puzzle solved!</h2>
                            <h3>Your time:</h3>
                            <h3 className="green-color">{levelObject.timeLimit - timeLeft.current.value} seconds</h3>
                        </div>) :
                        (progress === "incomplete") ? (<div>
                            <h2 className="red-color">Time's up!</h2>
                        </div>) : null
                    }
                </div>
            )}

        </main>
    );
};

export default Play_Page;