// import React from 'react';
import Container from 'react-bootstrap/Container';
import Badge from 'react-bootstrap/Badge';
import ListGroup from 'react-bootstrap/ListGroup';
// import { useController } from './controllerContext'


function Messages() {
  // const controller = useController()

  return (
      <Container>
      <ListGroup>
        <ListGroup.Item action as="li" className="d-flex justify-content-between align-items-start">
        <div className="ms-2 me-auto">
          <div className="fw-bold">Dave</div>Hi, how ya doing?</div>
          <Badge bg="warning">NEW</Badge>
        </ListGroup.Item>
        <ListGroup.Item action as="li" className="d-flex justify-content-between align-items-start">
        <div className="ms-2 me-auto">
          <div className="fw-bold">Hercule</div>
            Don't forget to get your tickets...
          </div>
        </ListGroup.Item>
        <ListGroup.Item action as="li" className="d-flex justify-content-between align-items-start">
        <div className="ms-2 me-auto">
          <div className="fw-bold">Barry</div>
            Haha LOL
          </div>
        </ListGroup.Item>
      </ListGroup>

      </Container>
  )
}

export default Messages

