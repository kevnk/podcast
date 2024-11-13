describe('Slideshow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('shows dev mode toggle and uses placeholders when enabled', () => {
    // Dev mode toggle should be visible in development
    cy.get('[data-test="dev-mode-toggle"]').should('be.visible')

    // Type something in the input
    cy.get('[data-test="title-input"]').type('Mountain sunset')

    // Enable dev mode
    cy.get('[data-test="dev-mode-toggle"]').click()

    // Wait for debounce
    cy.wait(600)

    // Background should use placeholder image
    cy.get('[data-test="slide-background"]')
      .should('have.attr', 'style')
      .and('include', 'placehold.co')

    // Console should show dev mode prompt
    cy.window().then((win) => {
      cy.spy(win.console, 'log').as('consoleLog')
    })

    // Type new text to trigger update
    cy.get('[data-test="title-input"]').clear().type('New text')
    cy.wait(600)

    cy.get('@consoleLog').should('have.been.calledWith', 
      'Enhanced prompt:', '[DEV MODE] Prompt for: New text')
  })
}) 