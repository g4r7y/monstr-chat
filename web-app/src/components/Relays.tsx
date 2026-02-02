import React from "react";
import type { ChatSettings } from "@core/chatModel";
import { useChatController } from "../chatControllerContext";
import { ListGroup, ListGroupItem } from "react-bootstrap";
import type { SettingsListener } from "@core/settingsListener";

function Relays() {
  const controller = useChatController();

  const [ settings, setSettings ] = React.useState<ChatSettings>( controller.getSettings() );
  
  React.useEffect(() => {
    console.log('userprofile render')
    const listener = new class implements SettingsListener {
      notifySettingsChanged(): void {
        setSettings(controller.getSettings())
      }
    }

    controller.addSettingsListener(listener)

    return () => {
      controller.removeSettingsListener(listener);
    }
  }, [])


  return (
    <div>
      <div className="row mb-2">Inbox relays:</div>
      <ListGroup className="mb-3">
      {settings.inboxRelays.map(relay => (
        <ListGroupItem className="list-group-item-secondary text-break">{relay}</ListGroupItem>)
      )}
      </ListGroup>
      <div className="row mb-2">General relays:</div>
      <ListGroup className="mb-3">
      {settings.generalRelays.map(relay => (
        <ListGroupItem className="list-group-item-secondary text-break">{relay}</ListGroupItem>)
      )}
      </ListGroup>

    </div>
  )
}

export default Relays