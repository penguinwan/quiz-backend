deploy_participant_table:
	mkdir -p build
	aws cloudformation package \
		--region eu-central-1 \
		--template-file deployment/participant-table.yaml \
		--output-template-file build/participant-table.yaml \
		--s3-bucket com.penguinwan.deployment
	aws --region eu-central-1 cloudformation deploy \
		--template-file build/participant-table.yaml \
		--stack-name participant-table \
		--no-fail-on-empty-changeset \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
	
deploy_participant:
	cd src/participant && npm i
	mkdir -p build
	aws cloudformation package \
		--region eu-central-1 \
		--template-file deployment/participant.yaml \
		--output-template-file build/participant.yaml \
		--s3-bucket com.penguinwan.deployment
	aws --region eu-central-1 cloudformation deploy \
		--template-file build/participant.yaml \
		--stack-name participant \
		--no-fail-on-empty-changeset \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

deploy_batch_table:
	mkdir -p build
	aws cloudformation package \
		--region eu-central-1 \
		--template-file deployment/batch-table.yaml \
		--output-template-file build/batch-table.yaml \
		--s3-bucket com.penguinwan.deployment
	aws --region eu-central-1 cloudformation deploy \
		--template-file build/batch-table.yaml \
		--stack-name batch-table \
		--no-fail-on-empty-changeset \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
	
deploy_batch:
	cd src/batch && npm i
	mkdir -p build
	aws cloudformation package \
		--region eu-central-1 \
		--template-file deployment/batch.yaml \
		--output-template-file build/batch.yaml \
		--s3-bucket com.penguinwan.deployment
	aws --region eu-central-1 cloudformation deploy \
		--template-file build/batch.yaml \
		--stack-name batch \
		--no-fail-on-empty-changeset \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM