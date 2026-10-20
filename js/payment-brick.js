(() => {
    const modal = document.getElementById('gift-checkout-modal');
    const closeButton = document.getElementById('gift-checkout-close');
    const titleElement = document.getElementById('gift-checkout-title');
    const amountElement = document.getElementById('gift-checkout-amount');
    const statusElement = document.getElementById('gift-checkout-status');
    const brickContainer = document.getElementById('paymentBrick_container');

    if (!modal || !closeButton || !titleElement || !amountElement || !statusElement || !brickContainer) {
        console.error('Gift checkout modal is missing required elements.');
        return;
    }

    let brickController = null;
    let renderSequence = 0;
    let lastTrigger = null;
    let submissionAttempted = false;

    const setStatus = (message) => {
        statusElement.textContent = message;
    };

    const renderPaymentBrick = async (amount, sequence) => {
        if (!window.MercadoPago) {
            setStatus('Não foi possível carregar o checkout do Mercado Pago. Verifique sua conexão e tente novamente.');
            return;
        }

        try {
            const mercadoPago = new window.MercadoPago(modal.dataset.publicKey, { locale: 'pt-BR' });
            const controller = await mercadoPago.bricks().create('payment', 'paymentBrick_container', {
                initialization: { amount },
                customization: {
                    paymentMethods: {
                        creditCard: 'all'
                    }
                },
                callbacks: {
                    onReady: () => {
                        if (sequence === renderSequence && modal.open) {
                            setStatus('Checkout de demonstração: o formulário pode gerar um token de teste, mas nenhum pagamento será enviado ou cobrado.');
                        }
                    },
                    onSubmit: ({ formData }) => {
                        submissionAttempted = true;
                        setStatus(formData && formData.token
                            ? 'Token de teste gerado pelo Mercado Pago. Nenhum pagamento foi enviado ou cobrado, e o token não foi salvo. Para concluir uma compra, será necessário conectar um servidor seguro.'
                            : 'O formulário foi enviado, mas nenhum pagamento foi processado ou cobrado. Para concluir uma compra, será necessário conectar um servidor seguro.');

                        return Promise.reject(new Error('Este checkout frontend não processa pagamentos.'));
                    },
                    onError: (error) => {
                        if (!submissionAttempted) {
                            setStatus('O checkout não conseguiu carregar. Nenhum pagamento foi processado.');
                        }
                        console.error('Mercado Pago Payment Brick error:', error);
                    }
                }
            });

            if (sequence !== renderSequence || !modal.open) {
                controller.unmount();
                return;
            }

            brickController = controller;
        } catch (error) {
            if (sequence === renderSequence && modal.open) {
                setStatus('Não foi possível iniciar o checkout do Mercado Pago. Nenhum pagamento foi processado.');
            }
            console.error('Failed to render Mercado Pago Payment Brick:', error);
        }
    };

    document.querySelectorAll('.gift-card').forEach((card) => {
        const title = card.querySelector('h3');
        const price = card.querySelector('.gift-value');

        if (!title || !price) {
            return;
        }

        const amount = Number(price.textContent.replace(/[^\d,]/g, '').replace(',', '.'));
        if (!Number.isFinite(amount) || amount <= 0) {
            console.error('Gift card has an invalid price:', title.textContent.trim());
            return;
        }

        const button = document.createElement('button');
        button.className = 'gift-buy';
        button.type = 'button';
        button.textContent = 'Presentear';
        button.setAttribute('aria-label', `Presentear: ${title.textContent.trim()}`);

        button.addEventListener('click', () => {
            lastTrigger = button;
            submissionAttempted = false;
            titleElement.textContent = title.textContent.trim();
            amountElement.textContent = price.textContent.trim();
            setStatus('Checkout de demonstração: nenhum pagamento será cobrado. Este site não tem um servidor seguro para processar pagamentos.');
            modal.showModal();
            const sequence = ++renderSequence;
            renderPaymentBrick(amount, sequence);
        });

        card.append(button);
    });

    const closeModal = () => {
        modal.close();
    };

    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    modal.addEventListener('close', () => {
        renderSequence += 1;
        if (brickController) {
            brickController.unmount();
            brickController = null;
        }
        brickContainer.replaceChildren();
        lastTrigger?.focus();
    });
})();
