import {
	ApplicationRef,
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input, NgZone,
	Output,
	ViewChild
} from '@angular/core';
import {EventHelperService} from '../event-helper.service';
import {AbstractEvent} from '../../event-registry/abstract-event';
import {OverlayService} from '../../../../overlay/overlay.service';
import {Overlay} from '@angular/cdk/overlay';
import {NpcStatesComponent} from '../../../npc-states-widget/npc-states/npc-states.component';
import {EventDetailComponent} from '../detail/event-detail.component';
import {OverlayRefControl} from '../../../../overlay/overlay-ref-control';

@Component({
	selector: 'app-row-text',
	templateUrl: './row-text.component.html',
	styleUrls: ['./row-text.component.scss']
})
export class RowTextComponent {
	private static clipboard;
	
	@ViewChild('elementRef') elementRef;
	
	@Input() text;
	@Input() data: AbstractEvent<any>;
	@Input() parent: AbstractEvent<any>[];
	@Input() hideGreaterSign = false;
	@Output() dblClick = new EventEmitter();
	@Output() click = new EventEmitter();
	@Output() dataChange = new EventEmitter();
	
	private overlayRef: OverlayRefControl;
	
	constructor(private storage: EventHelperService,
	            private overlayService: OverlayService,
	            private overlay: Overlay,
	            private helper: EventHelperService) {
	}
	
	leftClick(event: MouseEvent) {
		event.stopPropagation();
		this.storage.selectedEvent.next(this);
		this.click.emit(this);
	}
	
	rightClick(event: MouseEvent) {
		this.leftClick(event);
		
		const obj = this.overlayService.open(EventDetailComponent, {
			positionStrategy: this.overlay.position().global()
				.left('calc(28vw - 110px)')
				.top('calc((64px + 6vh / 2) + 60px)'),
			hasBackdrop: true,
			// backdropClass: '',
			backdropClickClose: true,
		});
		
		this.overlayRef = obj.ref;
		
		obj.instance.event = this.data;
		obj.instance.exit.subscribe(v => {
			this.overlayRef.close();
			this.data = v;
			this.data.update();
			this.dataChange.emit(v);
		}, e => this.overlayRef.close());
		
		return false;
	}
	
	doubleClick(event: MouseEvent) {
		event.stopPropagation();
		this.dblClick.emit(this);
	}
	
	// region keys copy/paste/del
	keyPress(event: KeyboardEvent) {
		event.stopPropagation();
		console.log(event.code);
		switch (event.code) {
			case 'Delete':
				this.delete();
				break;
			case 'KeyC':
				if (event.ctrlKey) {
					this.copy();
				}
				break;
			case 'KeyV':
				if (event.ctrlKey) {
					this.paste();
				}
				break;
		}
	}
	
	private copy() {
		if (this.data) {
			RowTextComponent.clipboard = this.data.export();
		}
	}
	
	private paste() {
		const clipboard = RowTextComponent.clipboard;
		if (clipboard) {
			const index = this.getIndex();
			this.parent.splice(index, 0, this.helper.getEventFromType(clipboard));
		}
	}
	
	private delete() {
		if (!this.data) {
			return;
		}
		const index = this.getIndex();
		this.parent.splice(index, 1);
	}
	
	// endregion
	
	private getIndex() {
		const index = this.parent.indexOf(this.data);
		return index === -1 ? this.parent.length : index;
	}
}
