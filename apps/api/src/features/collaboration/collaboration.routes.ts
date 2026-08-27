import { Router } from "express";
import * as CollaborationController from "./collaboration.controller";

export const collaborationRouter = Router();
collaborationRouter.post("/request", CollaborationController.sendRequest);
collaborationRouter.get("/requests/received", CollaborationController.getReceivedRequests);
collaborationRouter.get("/requests/sent", CollaborationController.getSentRequests);
collaborationRouter.patch("/requests/:id", CollaborationController.updateRequest);
