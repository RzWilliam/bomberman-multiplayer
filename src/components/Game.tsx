import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { Socket } from "socket.io-client";
import { BootScene } from "../game/scenes/BootScene";
import { GameScene } from "../game/scenes/GameScene";

interface GameProps {
  socket: Socket;
  roomId: string;
  playerId: string;
}

const Game: React.FC<GameProps> = ({ socket, roomId, playerId }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !gameInstance.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 600,
        height: 600,
        parent: gameRef.current,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { y: 0 },
            debug: false,
          },
        },
        scene: [BootScene, GameScene],
        scale: {
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      gameInstance.current = new Phaser.Game(config);

      // Pass socket, roomId, and playerId to the game scenes
      gameInstance.current.registry.set("socket", socket);
      gameInstance.current.registry.set("roomId", roomId);
      gameInstance.current.registry.set("playerId", playerId);
    }

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [socket, roomId, playerId]);

  return (
    <div className="w-full max-w-4xl">
      <div ref={gameRef} className="rounded-lg overflow-hidden shadow-lg"></div>
    </div>
  );
};

export default Game;
