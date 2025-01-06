import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { IManagedObject, OperationService } from '@c8y/client';
import { ActivatedRoute } from '@angular/router';
import { Flow, FlowStatus } from './shared/node-red-models';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { NodeRedFlowService } from './shared/node-red-flows.service';
import { RealtimeHelperService } from './shared/realtimeHelper.service';
import { Subscription } from 'rxjs';
import { AlertService } from '@c8y/ngx-components';


@Component({
  selector: 'app-node-red-tab',
  templateUrl: './node-red-tab.component.html'
})
export class NodeRedTabComponent implements OnInit, OnDestroy {

  private deviceId: string;
  deployedFlows: Flow[] = [];
  modalRef?: BsModalRef;
  flowStatus: FlowStatus = {};
  isRealtimeActive = false;
  operationsSubscription: Subscription;
  constructor(
    private route: ActivatedRoute, private operations: OperationService, private modalService: BsModalService, private flows: NodeRedFlowService, private alertservice: AlertService, private realtimeService: RealtimeHelperService) { }

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.parent.data.contextData["id"];
    this.loadData()
    this.isRealtimeActive = true;
    this.toggleRealtime(true);
  }

  ngOnDestroy(): void {
    if (this.operationsSubscription) {
      this.operationsSubscription.unsubscribe();
    }
  }

  async loadData() {
    this.deployedFlows = await this.flows.getDeployedFlows(this.deviceId);
    this.getFlowStatus(this.deployedFlows)
  }

  openModal(template: TemplateRef<any>, size: 'modal-lg'): void {
    this.modalRef = this.modalService.show(template, { class: size });
  }

  async addFlow(mo: IManagedObject) {
    if (!this.deployedFlows.some(f => f.c8yFlowId === mo.full.id)) {
      this.flows.assignToDevice(mo, this.deviceId)
    } else {
      this.alertservice.danger(`Flow with id ${mo.full.id} already deployed.`)
    }
  }

  async remove(flow: Flow) {
    this.flows.removeFromDevice(flow, this.deviceId).then(_ => this.loadData());
  }

  async update(flow: Flow) {
    console.log("update")
    this.flows.updateOnDevice(flow, this.deviceId).then(_ => this.loadData());
  }

  async getFlowStatus(flows: Flow[]) {
    const filter = {
      fragmentType: "c8y_NodeRed",
      deviceId: this.deviceId,
      withTotalPages: true,
      pageSize: 100,
      revert: true
    }
    await this.operations.list(filter)
      .then(res => flows.forEach(f => this.flowStatus[f.c8yFlowId] = res?.data.find(o => o.c8y_NodeRed?.flowId === f.c8yFlowId)?.status))
  }

  private toggleRealtime(on: boolean): void {
    if (on) {
      this.operationsSubscription = this.realtimeService.operations$(this.deviceId)
        .subscribe(o => this.flowStatus[o.data.c8y_NodeRed?.flowId] = o.data.status)
    }
    else {
      this.operationsSubscription.unsubscribe()
    }
  }
}
