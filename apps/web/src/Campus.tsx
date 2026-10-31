import { useEffect, useRef } from "react";

export type CampusLocation = "classroom" | "library" | "dorm" | "lab" | "club";
export default function Campus({
  onLocation,
  large = false,
}: {
  onLocation: (location: CampusLocation) => void;
  large?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onLocation);
  callback.current = onLocation;
  useEffect(() => {
    let stopped = false;
    let game: import("phaser").Game | undefined;
    void import("phaser").then(({ default: Phaser }) => {
      if (stopped || !host.current) return;
      class CampusScene extends Phaser.Scene {
        player!: import("phaser").GameObjects.Container;
        cursors?: import("phaser").Types.Input.Keyboard.CursorKeys;
        target?: { x: number; y: number };
        create() {
          const g = this.add.graphics();
          const rect = (
            x: number,
            y: number,
            w: number,
            h: number,
            color: number,
          ) => {
            g.fillStyle(color);
            g.fillRect(x, y, w, h);
          };
          rect(0, 0, 960, 520, 0xbacb99);
          for (let y = 0; y < 520; y += 12)
            for (let x = 0; x < 960; x += 12) {
              if ((x * 7 + y * 11) % 31 < 5) rect(x, y, 3, 3, 0xa9bf87);
            }
          rect(0, 350, 960, 92, 0xddd1a8);
          rect(0, 358, 960, 76, 0xe9ddb9);
          rect(422, 0, 84, 520, 0xddd1a8);
          rect(430, 0, 68, 520, 0xe9ddb9);
          for (let y = 360; y < 438; y += 18)
            for (let x = 0; x < 960; x += 32)
              rect(x + (y % 36 ? 16 : 0), y, 28, 1, 0xd7c99f);
          const tree = (x: number, y: number, size = 1) => {
            rect(x + 2, y + 23 * size, 11 * size, 26 * size, 0x82694b);
            rect(x - 18 * size, y + 6 * size, 48 * size, 30 * size, 0x517249);
            rect(x - 25 * size, y - 5 * size, 57 * size, 28 * size, 0x61834d);
            rect(x - 14 * size, y - 20 * size, 37 * size, 30 * size, 0x77975a);
            rect(x - 9 * size, y - 16 * size, 15 * size, 9 * size, 0x8ca667);
          };
          const flower = (x: number, y: number) => {
            rect(x, y, 2, 7, 0x668657);
            rect(x - 2, y - 1, 6, 4, 0xf2c98d);
          };
          const building = (
            x: number,
            y: number,
            w: number,
            h: number,
            roof: number,
            name: string,
            location: CampusLocation,
          ) => {
            rect(x + 9, y + 19, w, h, 0xa6b18a);
            rect(x, y, w, h, 0xf5e8c8);
            rect(x, y + h - 14, w, 14, 0xd5c5a2);
            for (let fy = y + 26; fy < y + h - 25; fy += 35)
              for (let fx = x + 17; fx < x + w - 10; fx += 34) {
                rect(fx - 2, fy - 2, 23, 27, 0xd6c29b);
                rect(fx, fy, 19, 23, 0x84b0ae);
                rect(fx + 8, fy, 3, 23, 0xf7eed8);
                rect(fx, fy + 10, 19, 3, 0xf7eed8);
              }
            rect(x + w / 2 - 15, y + h - 42, 30, 42, 0x795e45);
            rect(x + w / 2 - 11, y + h - 38, 22, 25, 0x91a99e);
            rect(x - 12, y - 12, w + 24, 18, roof);
            rect(x - 6, y - 24, w + 12, 15, roof);
            rect(x + 3, y - 36, w - 6, 15, roof);
            for (let rx = x; rx < x + w; rx += 16)
              rect(rx, y - 24, 2, 30, 0x000000 + Math.max(0, roof - 0x101010));
            const label = this.add
              .text(x + w / 2, y + h + 16, name, {
                fontFamily: "Arial, sans-serif",
                fontSize: "13px",
                color: "#314831",
                backgroundColor: "#f8f5e7",
                padding: { x: 10, y: 6 },
              })
              .setOrigin(0.5, 0);
            label
              .setInteractive({ useHandCursor: true })
              .on("pointerdown", () => callback.current(location));
            this.add
              .zone(x + w / 2, y + h / 2, w + 15, h + 50)
              .setInteractive({ useHandCursor: true })
              .on("pointerdown", () => callback.current(location));
          };
          building(95, 99, 240, 173, 0xa7654c, "GIẢNG ĐƯỜNG A", "classroom");
          building(588, 85, 208, 145, 0x718e7d, "THƯ VIỆN", "library");
          building(652, 285, 147, 69, 0xb48d5e, "PHÒNG MÁY", "lab");
          building(76, 440, 180, 75, 0x9f7159, "KÝ TÚC XÁ", "dorm");
          rect(844, 258, 82, 67, 0x9dbfae);
          rect(852, 265, 66, 52, 0x78a9a2);
          rect(857, 270, 56, 3, 0xa1c3b9);
          this.add
            .text(886, 335, "HỒ SEN", { fontSize: "11px", color: "#4e6e5e" })
            .setOrigin(0.5);
          for (const [x, y, s] of [
            [45, 49, 1.1],
            [385, 58, 1],
            [42, 284, 1.2],
            [380, 285, 1],
            [550, 288, 1],
            [854, 73, 1.3],
            [909, 154, 1],
            [877, 463, 1.2],
            [354, 465, 1],
          ] as number[][])
            tree(x, y, s);
          for (let i = 0; i < 25; i++)
            flower(110 + ((i * 47) % 670), 315 + (i % 3) * 7);
          const bench = (x: number, y: number) => {
            rect(x, y, 48, 7, 0x9c7953);
            rect(x, y + 10, 48, 7, 0xa9875f);
            rect(x + 5, y + 17, 4, 9, 0x6e7357);
            rect(x + 39, y + 17, 4, 9, 0x6e7357);
          };
          bench(280, 323);
          bench(539, 323);
          bench(835, 385);
          rect(467, 205, 3, 63, 0xa5a18a);
          rect(470, 205, 30, 20, 0xb6634c);
          rect(481, 211, 7, 7, 0xe4c36c);
          const person = (x: number, y: number, shirt: number) => {
            const p = this.add.graphics();
            p.fillStyle(0x475348, 0.14);
            p.fillEllipse(0, 16, 25, 9);
            p.fillStyle(0x433c32);
            p.fillRect(-8, -19, 16, 10);
            p.fillStyle(0xe9bd93);
            p.fillRect(-7, -13, 14, 12);
            p.fillStyle(shirt);
            p.fillRect(-9, -1, 18, 16);
            p.fillStyle(0x3d5360);
            p.fillRect(-7, 15, 5, 10);
            p.fillRect(2, 15, 5, 10);
            p.fillStyle(0xe5d6ad);
            p.fillRect(-11, 0, 5, 10);
            return this.add.container(x, y, [p]);
          };
          person(360, 390, 0xb37656);
          person(562, 393, 0x93a9b3);
          person(486, 308, 0xc6a45f);
          person(824, 397, 0x678c7c);
          this.player = person(457, 390, 0x365e48);
          this.add
            .text(456, 354, "BẠN", {
              fontFamily: "Arial",
              fontSize: "10px",
              color: "#fff",
              backgroundColor: "#365e48",
              padding: { x: 5, y: 3 },
            })
            .setOrigin(0.5)
            .setDepth(3);
          this.cursors = this.input.keyboard?.createCursorKeys();
          this.input.on(
            "pointerdown",
            (pointer: import("phaser").Input.Pointer) => {
              if (
                (pointer.y > 350 && pointer.y < 440) ||
                (pointer.x > 430 && pointer.x < 500)
              )
                this.target = { x: pointer.x, y: pointer.y };
            },
          );
          this.cameras.main.setRoundPixels(true);
        }
        update(_time: number, dt: number) {
          if (!this.player) return;
          const speed = Math.min(dt, 40) * 0.13;
          let dx =
            (this.cursors?.right.isDown ? 1 : 0) -
            (this.cursors?.left.isDown ? 1 : 0);
          let dy =
            (this.cursors?.down.isDown ? 1 : 0) -
            (this.cursors?.up.isDown ? 1 : 0);
          if (dx || dy) this.target = undefined;
          else if (this.target) {
            const d = Math.hypot(
              this.target.x - this.player.x,
              this.target.y - this.player.y,
            );
            if (d < 5) this.target = undefined;
            else {
              dx = (this.target.x - this.player.x) / d;
              dy = (this.target.y - this.player.y) / d;
            }
          }
          this.player.x = Phaser.Math.Clamp(
            this.player.x + dx * speed,
            30,
            930,
          );
          this.player.y = Phaser.Math.Clamp(
            this.player.y + dy * speed,
            295,
            495,
          );
        }
      }
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        width: 960,
        height: 520,
        backgroundColor: "#bacb99",
        pixelArt: true,
        antialias: false,
        input: { keyboard: { target: host.current } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: CampusScene,
        audio: { noAudio: true },
        fps: { target: 30, forceSetTimeOut: true },
      });
    });
    return () => {
      stopped = true;
      game?.destroy(true);
    };
  }, []);
  return (
    <div
      className={`campus-canvas ${large ? "large" : ""}`}
      ref={host}
      tabIndex={0}
      onPointerDown={() => host.current?.focus()}
      role="group"
      aria-label="Khuôn viên đại học pixel art. Dùng nút đi nhanh bên dưới để tới lớp, thư viện hoặc phòng máy bằng bàn phím."
    />
  );
}
