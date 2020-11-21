SRC=$(shell ls src)

$(SRC):
	cd src/$@ && npm i

build: $(SRC)

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

deploy_result_table:
	mkdir -p build
	aws cloudformation package \
		--region eu-central-1 \
		--template-file deployment/result-table.yaml \
		--output-template-file build/result-table.yaml \
		--s3-bucket com.penguinwan.deployment
	aws --region eu-central-1 cloudformation deploy \
		--template-file build/result-table.yaml \
		--stack-name result-table \
		--no-fail-on-empty-changeset \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

deploy_api: build
	mkdir -p build
	aws cloudformation package \
		--region eu-central-1 \
		--template-file deployment/api.yaml \
		--output-template-file build/api.yaml \
		--s3-bucket com.penguinwan.deployment
	aws --region eu-central-1 cloudformation deploy \
		--template-file build/api.yaml \
		--stack-name api \
		--no-fail-on-empty-changeset \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM