import {MapLayer, Point} from '../../../models/cross-code-map';
import * as Phaser from 'phaser';
import {Helper} from '../helper';

export class CCMapLayer {
	
	// TODO: don't use details.data, it's not updated and only used for import/export. Use getPhaserLayer() instead to get tile information
	public details!: MapLayer;
	
	private layer?: Phaser.Tilemaps.DynamicTilemapLayer;
	
	constructor(private tilemap: Phaser.Tilemaps.Tilemap) {
	}
	
	public async init(details: MapLayer) {
		if (typeof details.level === 'string') {
			// possible levels
			// 'first'
			// 'last'
			// 'light'
			// 'postlight'
			// 'object1'
			// 'object2'
			// 'object3'
			if (!isNaN(<any>details.level)) {
				details.level = parseInt(details.level, 10);
			} else {
				details.levelName = details.level;
				if (details.level.startsWith('first')) {
					details.level = 0;
				} else {
					// TODO: get actual max level;
					details.level = 10;
				}
			}
		}
		// noinspection SuspiciousTypeOfGuard
		if (typeof details.distance === 'string') {
			details.distance = parseFloat(details.distance);
		}
		this.details = details;
		this.layer = this.tilemap.createBlankDynamicLayer(details.name + Math.random(), 'stub');
		
		await this.updateTileset(details.tilesetName!);
		this.updateLevel(this.details.level);
		
		const skip = 'Navigation Collision HeightMap'.split(' ');
		// const skip = 'Navigation Background HeightMap'.split(' ');
		skip.forEach(type => {
			if (type === details.type) {
				this.visible = false;
			}
		});
	}
	
	get visible(): boolean {
		if (!this.layer) {
			return false;
		}
		return this.layer.visible;
	}
	
	set visible(val: boolean) {
		if (this.layer) {
			this.layer.visible = val;
			this.layer.active = val;
		}
	}
	
	get alpha(): number {
		if (!this.layer) {
			return 1;
		}
		return this.layer.alpha;
	}
	
	set alpha(val: number) {
		if (this.layer) {
			this.layer.alpha = val;
		}
	}
	
	destroy() {
		if (this.layer) {
			this.layer.destroy();
			this.layer = undefined;
		}
	}
	
	offsetLayer(offset: Point, borderTiles = false) {
		const data = this.details.data;
		const newData: number[][] = JSON.parse(JSON.stringify(data));
		
		for (let y = 0; y < data.length; y++) {
			for (let x = 0; x < data[y].length; x++) {
				let newTile = 0;
				let row = data[y - offset.y];
				if (!row && borderTiles) {
					row = offset.y > 0 ? data[0] : data[data.length - 1];
				}
				if (row) {
					newTile = row[x - offset.x];
					if (borderTiles && newTile === undefined) {
						newTile = offset.x > 0 ? row[0] : row[row.length - 1];
					}
				}
				newData[y][x] = newTile || 0;
			}
		}
		
		this.details.data = newData;
		if (this.layer) {
			this.layer.putTilesAt(this.details.data, 0, 0, false);
		}
	}
	
	resize(width: number, height: number, skipRender = false) {
		if (!this.layer) {
			return;
		}
		const details = this.details;
		details.width = width;
		details.height = height;
		
		this.extractLayerData(details);
		
		const newData: number[][] = [];
		for (let y = 0; y < details.height; y++) {
			newData[y] = [];
			const old = details.data[y] || [];
			for (let x = 0; x < details.width; x++) {
				newData[y][x] = old[x] || 0;
			}
		}
		details.data = newData;
		const tilesetName = this.layer.tileset[0].name;
		const visible = this.layer.visible;
		this.layer.destroy();
		
		this.layer = this.tilemap.createBlankDynamicLayer(details.name + Math.random(), tilesetName, 0, 0, details.width, details.height);
		this.layer.putTilesAt(details.data, 0, 0, false);
		this.visible = visible;
		
	}
	
	async updateTileset(tilesetname: string) {
		const details = this.details;
		details.tilesetName = tilesetname;
		if (details.tilesetName) {
			if (this.layer) {
				this.layer.destroy();
				this.layer = undefined;
			}
			const exists = await Helper.loadTexture(tilesetname, this.tilemap.scene);
			if (!exists) {
				return;
			}
			
			const newTileset = this.tilemap.addTilesetImage(tilesetname);
			if (!newTileset) {
				return;
			}
			newTileset.firstgid = 1;
			this.layer = this.tilemap.createBlankDynamicLayer(details.name + Math.random(), newTileset, 0, 0, details.width, details.height);
			this.layer.putTilesAt(details.data, 0, 0, false);
		}
	}
	
	updateLevel(level: number) {
		this.details.level = level;
		let zIndex = this.details.level * 10;
		if (isNaN(zIndex)) {
			zIndex = 999;
		}
		if (this.layer) {
			this.layer.depth = this.details.level * 10;
		}
	}
	
	getPhaserLayer(): Phaser.Tilemaps.DynamicTilemapLayer | undefined {
		return this.layer;
	}
	
	exportLayer(): MapLayer {
		const out: MapLayer = Object.assign({}, this.details);
		if (out.levelName) {
			out.level = out.levelName;
			out.levelName = undefined;
		}
		out.data = [];
		this.extractLayerData(out);
		return out;
	}
	
	private extractLayerData(layer: MapLayer): void {
		if (this.layer) {
			this.layer.getTilesWithin().forEach(tile => {
				if (!layer.data[tile.y]) {
					layer.data[tile.y] = [];
				}
				layer.data[tile.y][tile.x] = tile.index;
			});
		}
	}
}
