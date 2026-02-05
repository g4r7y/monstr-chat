import React from "react";
import { Col, ListGroup, ListGroupItem, Row } from "react-bootstrap";
import type { ChatSettings } from "@core/chatModel";
import type { SettingsListener } from "@core/settingsListener";
import { useChatController } from "../chatControllerContext";
import Nip05Address from "./Nip05Address";

function UserProfile() {
  const controller = useChatController();

  const [ settings, setSettings ] = React.useState<ChatSettings>( controller.getSettings() );
  
  React.useEffect(() => { 
    const listener = new class implements SettingsListener {
      notifySettingsChanged(): void {
        setSettings(controller.getSettings())
      }
    }
    controller.addSettingsListener(listener);

    return () => {
      controller.removeSettingsListener(listener);
    }
  }, [])

  return (
    <ListGroup>
      <ListGroupItem className="list-group-item-secondary text-break">
        <Row>
          <Col xs={4}>Your nickname:</Col>
          <Col xs={8}>{settings?.profileName ?? ''}</Col>
        </Row>
      </ListGroupItem>
      <ListGroupItem className="list-group-item-secondary text-break">
        <Row>
          <Col xs={4}>NIP-05 address:</Col>
          <Col xs={8}><Nip05Address npub={controller.getNpub()} nip05={settings.nip05} /></Col>
        </Row>
      </ListGroupItem>
      <ListGroupItem className="list-group-item-secondary text-break">
        <Row>
          <Col xs={4}>About:</Col>
          <Col xs={8}>{settings?.profileAbout ?? ''}</Col>
        </Row>
      </ListGroupItem>
    </ListGroup>
  )
}

export default UserProfile