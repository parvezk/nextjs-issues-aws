"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Textarea,
  Tooltip,
  useDisclosure,
} from "@nextui-org/react";
import { PlusIcon } from "lucide-react";
import { CreateIssueMutation } from "@/gql/createIssueMutation";
import { Provider, useQuery, useMutation } from "urql";
import urqlClient from "@/lib/urqlClient";
import "./globals.css";
import "./issues.css";

// TODO:move to gql fodler
const ISSUES_QUERY = `
  query IssuesForUser($email: String!) {
    issuesForUser(email: $email) {
      id
      title
      content
      status
    }
  }
`;

const UPDATE_ISSUE_STATUS_MUTATION = `
  mutation UpdateIssueStatus($id: String!, $status: String!) {
    updateIssueStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

const HomePage = () => {
  const [{ data, fetching, error }, replay] = useQuery({
    query: ISSUES_QUERY,
    variables: { email: "admin@admin.com" },
  });

  const [newIssueResult, createNewIssue] = useMutation(CreateIssueMutation);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [issueTitle, setTitleName] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>(
    {}
  );

  const onCreate = async (close) => {
    console.log("Creating issue", issueTitle, issueDescription);

    const input = {
      title: issueTitle,
      content: issueDescription,
      status: "BACKLOG", // Default status
      userId: "12345qwert", // Replace with actual user ID
    };

    const result = await createNewIssue({ input });

    if (result.error) {
      console.error("Failed to create issue", result.error);
    } else {
      console.log("Issue created", result.data.createIssue);
      close();
    }
  };

  const [, updateIssueStatus] = useMutation(UPDATE_ISSUE_STATUS_MUTATION);

  const handleStatusChange = (issueId: string, newStatus: string) => {
    updateIssueStatus(
      { id: issueId, status: newStatus },
      {
        // Optimistically update the cache without refetching
        update: (cache, mutationResult) => {
          if (!mutationResult.data) return;

          const currentData = cache.readQuery({
            query: ISSUES_QUERY,
            variables: { email: "admin@admin.com" },
          });

          if (currentData) {
            const updatedIssues = currentData.issuesForUser.map((issue: any) =>
              issue.id === issueId ? { ...issue, status: newStatus } : issue
            );

            cache.writeQuery({
              query: ISSUES_QUERY,
              variables: { email: "admin@admin.com" },
              data: { issuesForUser: updatedIssues },
            });
          }
        },
      }
    );
  };

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <header>
        <h2>Issues</h2>
        <Tooltip content="New Issue">
          <button
            className="text-white bg-black p-1 rounded-md"
            onClick={onOpen}
          >
            <PlusIcon size={14} />
          </button>
        </Tooltip>
      </header>
      <main>
        <ol className="issues-list">
          <li>
            <h4>Title</h4>
            <h4>Content</h4>
            <h4>Status</h4>
          </li>
          {data?.issuesForUser.map((issue: any) => (
            <li key={issue.id}>
              <h4>{issue.title}</h4>
              <p>{issue.content || "No content"}</p>
              <div>
                <select
                  value={selectedStatus[issue.id] || issue.status}
                  onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">Todo</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </li>
          ))}
        </ol>
      </main>
      <Modal
        size="2xl"
        isOpen={isOpen}
        placement="top-center"
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-sm text-black/70">New issue</span>
              </ModalHeader>
              <ModalBody>
                <div>
                  <input
                    autoFocus
                    type="text"
                    className="w-full border-none outline-none focus:outline-none focus:border-none py-2 text-xl text-black/70"
                    placeholder="Issue Title"
                    value={issueTitle}
                    onChange={(e) => setTitleName(e.target.value)}
                  />
                </div>
                <div className="bg-white">
                  <Textarea
                    size="lg"
                    variant="bordered"
                    placeholder="Issue description"
                    className="bg-white"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    classNames={{
                      inputWrapper: "bg-white border-none shadow-none p-0",
                      base: "bg-white p-0",
                      input: "bg-white p-0",
                      innerWrapper: "bg-white p-0",
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter className="border-t">
                <Button variant="ghost" onPress={() => onOpenChange()}>
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  className="bg-black text-white"
                  onPress={() => onCreate(onClose)}
                >
                  Create Issue
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default function App() {
  return (
    <Provider value={urqlClient}>
      <HomePage />
    </Provider>
  );
}
